# wxm-toolbox-ui Change Log

Version numbers are semver-compatible dates in YYYY.MM.DD-X format,
where X is the revision number


# 2021.6.29

### Fixes
* **Provision:** Fix crash related to Webex logging.


# 2021.3.24

### Features
* **Provision:** Retry the provision REST requests to WXM up to 10 times each if
they fail due to network connectivity errors.


# 2021.3.15-4

### Features
* **Provision:** Improve provision status detail to started/complete for agent
and supervisor.


# 2021.3.15-3

### Features
* **Provision:** Add support for fixing provision data when user already exists.
* **Product Vertical:** Update view names for Product vertical.

### Bug Fixes
* **Cache:** Fix issue where user cache was not updated properly after the
initial startup caching. Replace user cache every 10 minutes.


# 2021.3.15-2

### Features
* **Product Vertical:** Update product views for supervisor for the v2 demo.


# 2021.3.15-1

### Features
* **Logging:** Get Webex logs room ID and REST token from toolbox global
variables.


# 2021.3.15

### Features
* **Logging:** Log POST request body to JSON files for debugging.


# 2020.12.7-1

### Bug Fixes
* **Create User:** fix crash from syntax errors in create user options


# 2020.12.7

### Features
* **Create User:** Set isEmailVerified to false, highPrecisionMode to true 
for provisioning new user agent and supervisor. Update Bank vertical supervisor
views, replacing "Website" with "Net Banking"
