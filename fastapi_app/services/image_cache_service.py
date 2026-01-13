"""
Image Cache Service - Temporary storage for generated images

Stores images in memory with automatic expiration.
Used to avoid streaming large base64 images through SSE.
"""
import uuid
import time
import base64
import logging
from typing import Dict, Optional, Tuple
from threading import Lock

logger = logging.getLogger(__name__)

# Cache expiration time in seconds (15 minutes)
CACHE_EXPIRATION = 900


class ImageCacheService:
    """In-memory cache for generated images with automatic expiration"""

    _instance = None
    _lock = Lock()

    def __new__(cls):
        """Singleton pattern to ensure one cache instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._cache: Dict[str, dict] = {}
                    cls._instance._cache_lock = Lock()
        return cls._instance

    def store_image(self, image_data: str, mime_type: str, title: str = None) -> str:
        """
        Store an image in the cache and return a unique ID

        Args:
            image_data: Base64-encoded image data
            mime_type: Image MIME type (e.g., 'image/png')
            title: Optional title for the image

        Returns:
            Unique image ID for retrieval
        """
        image_id = str(uuid.uuid4())

        with self._cache_lock:
            self._cache[image_id] = {
                'image_data': image_data,
                'mime_type': mime_type,
                'title': title,
                'created_at': time.time()
            }

        # Clean expired entries
        self._cleanup_expired()

        logger.info(f"Stored image {image_id} ({mime_type}, {len(image_data)} chars)")
        return image_id

    def get_image(self, image_id: str) -> Optional[dict]:
        """
        Retrieve an image from the cache

        Args:
            image_id: The unique image ID

        Returns:
            Dict with image_data, mime_type, title or None if not found/expired
        """
        with self._cache_lock:
            entry = self._cache.get(image_id)

            if entry is None:
                return None

            # Check if expired
            if time.time() - entry['created_at'] > CACHE_EXPIRATION:
                del self._cache[image_id]
                return None

            return {
                'image_data': entry['image_data'],
                'mime_type': entry['mime_type'],
                'title': entry['title']
            }

    def get_image_bytes(self, image_id: str) -> Optional[Tuple[bytes, str]]:
        """
        Retrieve an image as bytes (decoded from base64)

        Args:
            image_id: The unique image ID

        Returns:
            Tuple of (image_bytes, mime_type) or None if not found
        """
        image = self.get_image(image_id)
        if image is None:
            return None

        try:
            image_bytes = base64.b64decode(image['image_data'])
            return image_bytes, image['mime_type']
        except Exception as e:
            logger.error(f"Error decoding image {image_id}: {e}")
            return None

    def delete_image(self, image_id: str) -> bool:
        """
        Delete an image from the cache

        Args:
            image_id: The unique image ID

        Returns:
            True if deleted, False if not found
        """
        with self._cache_lock:
            if image_id in self._cache:
                del self._cache[image_id]
                return True
            return False

    def _cleanup_expired(self):
        """Remove expired entries from cache"""
        current_time = time.time()
        expired = []

        with self._cache_lock:
            for image_id, entry in self._cache.items():
                if current_time - entry['created_at'] > CACHE_EXPIRATION:
                    expired.append(image_id)

            for image_id in expired:
                del self._cache[image_id]

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired images from cache")

    def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        with self._cache_lock:
            return {
                'total_images': len(self._cache),
                'total_size_chars': sum(len(e['image_data']) for e in self._cache.values())
            }


# Global instance
_image_cache = None


def get_image_cache() -> ImageCacheService:
    """Get the global image cache instance"""
    global _image_cache
    if _image_cache is None:
        _image_cache = ImageCacheService()
    return _image_cache
