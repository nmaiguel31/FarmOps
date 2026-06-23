# FarmOps BDD Scenarios



## Feature: Geospatial Farm Monitoring

### Scenario: Identify fields within a selected farm boundary

Given a farm manager has created a farm boundary
And the farm contains multiple fields with polygon boundaries
When the manager selects the farm in Field Operations
Then the system should display only the fields inside that farm
And the manager should be able to inspect each field’s crop, health, weather, and lifecycle data

Business value:
This helps farm managers monitor land usage and field-level performance without needing physical inspections for every plot.

---

## Feature: Financial Profitability Analysis

### Scenario: Calculate profit by crop

Given financial records are linked to farms, fields, and crops
When the manager opens the financial dashboard
Then the system should calculate revenue, expenses, and profit by crop
And the manager should identify which crops are most profitable

Business value:
This supports better planting and investment decisions by showing which crops generate the highest return.

---

## Feature: AI Agronomic Recommendations

### Scenario: Generate irrigation recommendation from field conditions

Given a field has low soil moisture
And rain probability is low
And the field has an active crop
When the manager opens the field breakdown
Then the system should display an irrigation recommendation with priority level and suggested action

Business value:
This helps managers take timely action to reduce crop stress and avoid yield loss.

---

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
