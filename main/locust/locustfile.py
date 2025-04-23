import logging
import os
import random
import secrets
import string
from locust import between, task
from locust import HttpUser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

class TestingLocust(HttpUser):
    wait_time = between(1, 3)
    host = os.getenv("TARGET_HOST")
    if not host:
        logger.warning("TARGET_HOST not set, defaulting to http://localhost:3000")
        host = "http://localhost:3000"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.paste_ids = []
        self.total_pages = None
        logger.info("TestingLocust initialized")

    def on_start(self):
        logger.info("User session started")

    @task(2)
    def visit_main_page(self):
        with self.client.get("/", name="/", catch_response=True) as response:
            if response.status_code == 200 or response.status_code == 304:
                response.success()
                logging.info(f"Visit main page (status={response.status_code})")
            elif response.status_code == 0:
                response.failure("Connection failed: No response")
                logging.error(f"Failed to visit main page (status={response.status_code}): No response")
            else:
                response.failure(response.text)
                logging.error(f"Failed to visit main page (status={response.status_code}): {response.text}")

    @task(3)
    def create_paste(self):
        content = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(200))
        title = ''.join(secrets.choice(string.ascii_letters) for _ in range(10)) if secrets.randbelow(2) else ""
        expires_in = secrets.choice(["", "0.2", "1", "60", "1440", "10080", "43200"])
        privacy = secrets.choice(["public", "private"])
        form_data = {
            "content": content,
            "title": title,
            "language": language,
            "expires_in": expires_in,
            "privacy": privacy
        }
        with self.client.post("/paste", data=form_data, headers={"Content-Type": "application/x-www-form-urlencoded"},
                               allow_redirects=False, catch_response=True) as response:
            if response.status_code == 302:
                paste_id = response.headers.get('Location', '').split('/')[-1]
                if paste_id:
                    self.paste_ids.append(paste_id)
                response.success()
                logging.info(f"Created new paste (status={response.status_code})")
            else:
                error_message = "Connection failed: No response" if response.status_code == 0 else response.text
                response.failure(error_message)
                logging.error(f"Failed to create paste (status={response.status_code}): {error_message}")
            
    @task(2)
    def visit_paste(self):
        if self.paste_ids:
            paste_id = random.choice(self.paste_ids)
            with self.client.get(f"/paste/{paste_id}", name="/paste/:id", catch_response=True) as response:
                status = response.status_code
                if status in (200, 404):
                    response.success()
                    logger.info(f"[Success] Visit paste (status={status})")
                elif status == 0:
                    response.failure("Connection failed: No response")
                    logger.error("[Error] Failed to visit paste (status=0)")
                else:
                    response.failure(response.text)
                    logger.error(f"[Error] Failed to visit paste (status={status})")

    @task(1)
    def visit_paste_list(self):

        with self.client.get("/paste_list?page=1", name="/paste_list?page", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                logger.info(f"Visit paste list successfully (status={response.status_code})")
            elif response.status_code == 0:
                response.failure("Connection failed: No response")
                logger.error("Connection failed while loading paste list (status=0)")
            else:
                response.failure(response.text)
                logger.error(f"Failed to load paste list (status={response.status_code}): {response.text}")


    @task(1)
    def visit_stats(self):
        year = random.randint(2020, 2025)
        month = random.choice(range(1, 13)) 
        month_str = f"{year}-{month:02d}"
        url = f"/stats/{month_str}"

        with self.client.get(url, name="/stats", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                logger.info(f"Stats loaded successfully (status={response.status_code})")
            elif response.status_code == 0:
                response.failure("Connection error: No response received")
                logger.error(f"Unable to load stats: No response (status={response.status_code})")
            else:
                response.failure(f"Unexpected status code: {response.status_code} - {response.text}")
                logger.error(f"Failed to retrieve stats (status={response.status_code}, message={response.text})")