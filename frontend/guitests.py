import unittest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By

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

if __name__ == "__main__":
  unittest.main()
