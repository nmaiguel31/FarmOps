# FarmOps BDD Scenarios

## Feature: User Authentication

### Scenario: Successful login without MFA

Given a manager account exists

And MFA is disabled

When the user enters valid credentials

Then the user should be redirected to the Dashboard

---

### Scenario: Successful login with MFA

Given an admin account exists

And MFA is enabled

When the user enters valid credentials

Then the user should be redirected to the MFA page

---

### Scenario: MFA verification success

Given MFA is enabled

When the user enters a valid authentication code

Then access should be granted

And the user should be redirected to the Dashboard

---

### Scenario: MFA verification failure

Given MFA is enabled

When the user enters an invalid authentication code

Then an error message should be displayed

And access should be denied

---

## Feature: Farm Management

### Scenario: Create a farm

Given the user is authenticated

When the user creates a new farm

Then the farm should be saved in the database

---

### Scenario: Edit a farm

Given a farm exists

When the user updates farm information

Then the changes should be saved

---

### Scenario: Delete a farm

Given a farm exists

When the user deletes the farm

Then the farm should be removed from the database

---

## Feature: Crop Management

### Scenario: Create a crop

Given a farm exists

When the user creates a crop

Then the crop should be linked to the farm

---

### Scenario: Update a crop

Given a crop exists

When the user edits the crop

Then the updated information should be saved

---

### Scenario: Delete a crop

Given a crop exists

When the user deletes the crop

Then the crop should be removed from the database

---

## Feature: Financial Records

### Scenario: Create a revenue record

Given the user is authenticated

When the user records a revenue transaction

Then the transaction should be saved

---

### Scenario: Create an expense record

Given the user is authenticated

When the user records an expense transaction

Then the transaction should be saved

---

### Scenario: View financial summary

Given financial records exist

When the user opens the Dashboard

Then revenue, expenses, and profit should be calculated correctly

---

## Feature: Dashboard

### Scenario: View farm statistics

Given farms and crops exist

When the user opens the Dashboard

Then farm statistics should be displayed

---

### Scenario: View farm locations

Given farms have coordinates

When the Dashboard loads

Then farm locations should appear on the map
