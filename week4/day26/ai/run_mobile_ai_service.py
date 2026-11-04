"""Start the Day 26 mobile gateway."""

from __future__ import annotations

import logging
import os

from mobile_ai_service import MobileAIService


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    upstream_url = os.getenv(
        "DAY25_AI_BASE_URL",
        "http://127.0.0.1:5002",
    )
    host = os.getenv("MOBILE_AI_HOST", "0.0.0.0")
    port = int(os.getenv("MOBILE_AI_PORT", "5003"))

    service = MobileAIService(upstream_base_url=upstream_url)
    service.run(host=host, port=port)


if __name__ == "__main__":
    main()