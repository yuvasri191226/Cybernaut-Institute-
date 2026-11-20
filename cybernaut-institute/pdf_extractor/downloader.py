"""
Safe PDF Downloader and Local File Handler.
Enforces streaming, timeouts, maximum file size, PDF magic byte validation,
path traversal prevention, and SSRF protections.
"""
import os
import re
import socket
import tempfile
import ipaddress
from urllib.parse import urlparse
from typing import Optional, Tuple
import requests

try:
    from . import config
except ImportError:
    import config


class DownloadError(Exception):
    """Base exception for PDF download errors."""
    pass


class MaxFileSizeExceededError(DownloadError):
    """Raised when downloaded content exceeds the configured size limit."""
    pass


class InvalidPDFSignatureError(DownloadError):
    """Raised when file does not start with standard PDF signature (%PDF-)."""
    pass


class SSRFSecurityError(DownloadError):
    """Raised when remote URL points to private/loopback/prohibited IP address."""
    pass


def is_safe_ip(ip_str: str) -> bool:
    """
    Checks if an IP address is a safe public address.
    Rejects private, loopback, link-local, multicast, and reserved addresses.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
        return True
    except ValueError:
        return False


def validate_remote_url(url: str, allow_private: bool = False) -> str:
    """
    Validates URL scheme and resolves target host to check against SSRF.
    """
    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise SSRFSecurityError(f"Unsupported URL scheme '{scheme}'. Only HTTP and HTTPS are allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFSecurityError(f"Invalid URL host in '{url}'")

    # If allow_private is enabled (e.g. for mock/unit testing), bypass IP check
    if allow_private or config.ALLOW_PRIVATE_IPS:
        return url

    # Resolve IP addresses for hostname
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise DownloadError(f"Failed to resolve hostname '{hostname}': {e}")

    for info in addr_info:
        ip_addr = info[4][0]
        if not is_safe_ip(ip_addr):
            raise SSRFSecurityError(
                f"SSRF violation: Host '{hostname}' resolves to restricted IP '{ip_addr}'"
            )

    return url


def resolve_local_file_path(file_path_or_url: str) -> Optional[str]:
    """
    Resolves a local file path or file:// URL if valid, preventing path traversal.
    Returns the absolute path if it points to an existing file, or None if remote.
    """
    raw_path = file_path_or_url
    if raw_path.startswith("file://"):
        raw_path = raw_path[7:]
        # On Windows, file:///C:/path or file://C:/path
        if re.match(r"^/[A-Za-z]:", raw_path):
            raw_path = raw_path[1:]

    # Check if this could be an existing local file
    if os.path.isabs(raw_path) or raw_path.startswith(".") or not (
        raw_path.startswith("http://") or raw_path.startswith("https://")
    ):
        # Resolve path
        abs_path = os.path.abspath(raw_path)
        if os.path.isfile(abs_path):
            return abs_path

        # Also check relative to sample_pdfs directory
        sample_path = os.path.abspath(os.path.join(config.SAMPLE_PDFS_DIR, os.path.basename(raw_path)))
        if os.path.isfile(sample_path):
            return sample_path

    return None


def verify_pdf_magic_bytes(file_path: str) -> bool:
    """Checks whether the file starts with the %PDF- header within the first 1024 bytes."""
    try:
        with open(file_path, "rb") as f:
            header = f.read(1024)
            return b"%PDF-" in header
    except Exception:
        return False


def download_or_get_pdf(
    source_url_or_path: str,
    temp_dir: Optional[str] = None,
    allow_private_ips: bool = False,
) -> Tuple[str, bool]:
    """
    Acquires a PDF file from a remote URL or local path.
    Returns a tuple of: (local_file_path, is_temporary)
    where is_temporary indicates if the caller must delete the file after extraction.
    """
    if not source_url_or_path or not source_url_or_path.strip():
        raise DownloadError("Empty file URL or path provided.")

    target = source_url_or_path.strip()

    # 1. Check if source is a local file
    local_path = resolve_local_file_path(target)
    if local_path:
        if not verify_pdf_magic_bytes(local_path):
            raise InvalidPDFSignatureError(
                f"Local file '{local_path}' is not a valid PDF (missing %PDF- header)."
            )
        return local_path, False

    # 2. Remote URL handling
    validate_remote_url(target, allow_private=allow_private_ips)

    target_dir = temp_dir or config.TEMP_DIR
    os.makedirs(target_dir, exist_ok=True)

    temp_file = tempfile.NamedTemporaryFile(
        dir=target_dir, delete=False, suffix=".pdf"
    )
    temp_path = temp_file.name

    try:
        session = requests.Session()
        # Follow redirects manually to validate redirect targets against SSRF
        current_url = target
        max_redirects = 5

        for _ in range(max_redirects):
            validate_remote_url(current_url, allow_private=allow_private_ips)
            response = session.get(
                current_url,
                stream=True,
                timeout=(config.DOWNLOAD_TIMEOUT, config.DOWNLOAD_TIMEOUT),
                allow_redirects=False,
                headers={"User-Agent": "CybernautPDFExtractor/1.0"},
            )

            if response.is_redirect or response.is_permanent_redirect:
                redirect_url = response.headers.get("Location")
                if not redirect_url:
                    raise DownloadError(f"HTTP redirect from '{current_url}' without Location header.")
                current_url = requests.compat.urljoin(current_url, redirect_url)
                continue

            response.raise_for_status()
            break
        else:
            raise DownloadError(f"Exceeded maximum redirects ({max_redirects}) for URL '{target}'")

        # Stream content and enforce size limit
        bytes_written = 0
        first_chunk = True

        for chunk in response.iter_content(chunk_size=8192):
            if not chunk:
                continue

            bytes_written += len(chunk)
            if bytes_written > config.MAX_FILE_SIZE_BYTES:
                temp_file.close()
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise MaxFileSizeExceededError(
                    f"File exceeds maximum allowed size of {config.MAX_FILE_SIZE_MB} MB."
                )

            temp_file.write(chunk)

            # Validate magic bytes on first chunk
            if first_chunk and bytes_written >= 4:
                temp_file.flush()
                first_chunk = False

        temp_file.close()

        # Validate that written file has valid PDF signature
        if not verify_pdf_magic_bytes(temp_path):
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise InvalidPDFSignatureError(
                f"Downloaded content from '{target}' does not have a valid PDF signature."
            )

        return temp_path, True

    except requests.exceptions.Timeout as e:
        temp_file.close()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise DownloadError(f"Connection timed out while downloading '{target}': {e}")
    except requests.exceptions.HTTPError as e:
        temp_file.close()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise DownloadError(f"HTTP error {e.response.status_code} while downloading '{target}': {e}")
    except requests.exceptions.RequestException as e:
        temp_file.close()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise DownloadError(f"Network error while downloading '{target}': {e}")
    except Exception:
        temp_file.close()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise


def cleanup_temp_file(file_path: Optional[str]) -> None:
    """Safely removes a temporary file if it exists."""
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
