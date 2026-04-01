import unittest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import time

'''
Attribution: Ed Post #267 states we can reuse boilerplate code from previous year's
groups. 

Boilerplate Template for Selenium Tests from previous year's AccessATX group:
https://gitlab.com/anjalikaimal/cs373-fall-2025-55090_11
'''

options = Options()
options.add_argument("--headless")  
options.add_argument("--no-sandbox")  
options.add_argument("--disable-dev-shm-usage")  
options.add_argument("--start-maximized")  
options.add_argument("--window-size=1920,1080")

service = Service(ChromeDriverManager().install())
base_url = "https://civichousing.me"

class CivicHousingUnitTests(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls.driver = webdriver.Chrome(service=service, options=options)
    cls.driver.get(base_url)

  @classmethod
  def tearDownClass(cls):
    cls.driver.quit()

  def setUp(self):
    self.driver.get(base_url)

  def wait_for_element(self, by, value, timeout=20):
    end_time = time.time() + timeout
    while time.time() < end_time:
      elements = self.driver.find_elements(by, value)
      if elements:
        return elements[0]
      time.sleep(0.5)
    self.fail(f"Timed out waiting for element: {by}={value}")

  def test_home_page(self):
    self.assertIn("Welcome to Civic Housing", self.driver.find_element(By.TAG_NAME, "h1").text)

  # Test 2
  def test_community_text(self):
    self.driver.get(base_url + "/community")
    self.assertIn("Communities", self.driver.find_element(By.TAG_NAME, "h2").text)

  # Test 3
  def test_housing_text(self):
    self.driver.get(base_url + "/housing")
    self.assertIn("Housing", self.driver.find_element(By.TAG_NAME, "h2").text)

  # Test 4
  def test_transportation_text(self):
    self.driver.get(base_url + "/transportation")
    self.assertIn("Transportation", self.driver.find_element(By.TAG_NAME, "h2").text)

  # Test 5
  def test_about_text(self):
    self.driver.get(base_url + "/about")
    self.assertIn("About CivicHousing", self.driver.find_element(By.TAG_NAME, "h1").text)
  
  # Test 6
  def test_home_url(self): 
    self.driver.get(base_url)
    self.assertEqual(self.driver.current_url.rstrip("/"), (base_url).rstrip("/"))
  
  # Test 7 
  def test_community_url(self): 
    self.driver.get(base_url + "/community")
    self.assertEqual(self.driver.current_url.rstrip("/"), (base_url + "/community").rstrip("/"))
  
  # Test 8
  def test_housing_url(self): 
    self.driver.get(base_url + "/housing")
    self.assertEqual(self.driver.current_url.rstrip("/"), (base_url + "/housing").rstrip("/"))

  # Test 9
  def test_transportation_url(self): 
    self.driver.get(base_url + "/transportation")
    self.assertEqual(self.driver.current_url.rstrip("/"), (base_url + "/transportation").rstrip("/"))

  # Test 10
  def test_about_url(self):
    self.driver.get(base_url + "/about")
    self.assertEqual(self.driver.current_url.rstrip("/"), (base_url + "/about").rstrip("/"))

  # Test 11
  def test_data_badge_visible_on_housing_page(self):
    self.driver.get(base_url + "/housing")
    badge = self.wait_for_element(By.XPATH, "//*[contains(text(), 'Data as of')]")
    self.assertIn("Data as of", badge.text)

  # Test 12
  def test_data_badge_visible_on_community_page(self):
    self.driver.get(base_url + "/community")
    badge = self.wait_for_element(By.XPATH, "//*[contains(text(), 'Data as of')]")
    self.assertIn("Data as of", badge.text)

  # Test 13
  def test_data_badge_visible_on_transportation_page(self):
    self.driver.get(base_url + "/transportation")
    badge = self.wait_for_element(By.XPATH, "//*[contains(text(), 'Data as of')]")
    self.assertIn("Data as of", badge.text)

  # Test 14
  def test_housing_instance_has_get_directions_link(self):
    self.driver.get(base_url + "/housing")

    housing_link = self.wait_for_element(By.CSS_SELECTOR, "a[href*='/housing/']")
    housing_href = housing_link.get_attribute("href")
    self.assertIsNotNone(housing_href)
    self.driver.get(housing_href)

    directions_link = self.wait_for_element(By.LINK_TEXT, "Get Directions")

    href = directions_link.get_attribute("href")
    self.assertIn("google.com/maps/search/?api=1&query=", href)

  # Test 15
  def test_community_badge_persists_after_sort_change(self):
    self.driver.get(base_url + "/community")

    select_el = self.wait_for_element(By.ID, "select")

    options = select_el.find_elements(By.TAG_NAME, "option")
    if len(options) > 1:
      options[1].click()

    badge = self.wait_for_element(By.XPATH, "//*[contains(text(), 'Data as of')]")
    self.assertIn("Data as of", badge.text)

  def test_global_search_page_title(self):
    self.driver.get(base_url + "/globalsearch")
    h1 = self.wait_for_element(By.TAG_NAME, "h1")
    self.assertIn("Global Search", h1.text)

  def test_global_search_submission_shows_outcome(self):
    self.driver.get(base_url + "/globalsearch")
    inp = self.wait_for_element(By.CSS_SELECTOR, 'input[placeholder*="Search housing"]')
    inp.clear()
    inp.send_keys("787")
    self.driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    self.wait_for_element(
      By.XPATH,
      '//*[contains(text(), "Results for") or contains(text(), "No results found")]'
    )

  def test_housing_inline_search_shows_banner(self):
    self.driver.get(base_url + "/housing")
    inp = self.wait_for_element(By.CSS_SELECTOR, 'input[placeholder*="Search housing"]')
    inp.clear()
    inp.send_keys("austin")
    buttons = self.driver.find_elements(By.XPATH, '//button[contains(text(), "Search")]')
    self.assertTrue(len(buttons) >= 1)
    buttons[0].click()
    banner = self.wait_for_element(By.XPATH, '//*[contains(text(), "Showing results for")]')
    self.assertIn("Showing results for", banner.text)

  def test_housing_sort_keeps_housing_heading(self):
    self.driver.get(base_url + "/housing")
    self.wait_for_element(By.TAG_NAME, "h2")
    select_el = self.wait_for_element(By.ID, "select")
    options = select_el.find_elements(By.TAG_NAME, "option")
    if len(options) > 1:
      options[1].click()
    h2 = self.wait_for_element(By.TAG_NAME, "h2")
    self.assertIn("Housing", h2.text)

  def test_housing_multifamily_filter_applies(self):
    self.driver.get(base_url + "/housing")
    self.wait_for_element(By.TAG_NAME, "h2")
    filters_btn = self.wait_for_element(By.XPATH, '//button[.//span[text()="Filters"]]')
    filters_btn.click()
    multifamily = self.wait_for_element(By.ID, "filter-unit_type-2")
    if not multifamily.is_selected():
      multifamily.click()
    apply_btn = self.wait_for_element(By.XPATH, '//button[contains(text(), "Apply filters")]')
    apply_btn.click()
    active = self.wait_for_element(
      By.XPATH,
      '//p[.//span[contains(text(), "Active filters:")] and contains(., "Multifamily")]'
    )
    self.assertIn("Multifamily", active.text)

if __name__ == "__main__":
  unittest.main()
