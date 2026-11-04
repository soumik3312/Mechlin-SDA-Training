"""Launch the Day 25 local AI web service."""

from __future__ import annotations

import logging

from .web_ai_service import AIWebService


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    service = AIWebService()
    service.run(host="127.0.0.1", port=5002)


if __name__ == "__main__":
    main()