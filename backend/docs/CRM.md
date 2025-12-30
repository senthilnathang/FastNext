# CRM Module Documentation

The CRM (Customer Relationship Management) module provides comprehensive sales pipeline management, lead tracking, opportunity management, and customer data organization.

## Overview

The CRM module is a full-featured sales management system that includes:

- **Leads Management**: Track and qualify potential customers
- **Opportunities Management**: Manage deals through customizable pipelines
- **Contacts Management**: Organize customer contact information
- **Accounts Management**: Track companies and organizations
- **Activities Management**: Log calls, meetings, tasks, and emails
- **Pipeline Configuration**: Customizable sales stages and workflows

## Architecture

### Backend Structure

```
backend/modules/crm/
├── __init__.py
├── __manifest__.py          # Module metadata and menu definitions
├── api/
│   ├── __init__.py
│   ├── accounts.py          # Accounts CRUD endpoints
│   ├── activities.py        # Activities CRUD endpoints
│   ├── contacts.py          # Contacts CRUD endpoints
│   ├── leads.py             # Leads CRUD + Kanban + Convert
│   ├── opportunities.py     # Opportunities CRUD + Kanban + Won/Lost
│   ├── pipelines.py         # Pipeline configuration endpoints
│   └── stages.py            # Stage configuration endpoints
├── models/
│   ├── __init__.py
│   ├── account.py           # Account SQLAlchemy model
│   ├── activity.py          # Activity SQLAlchemy model
│   ├── contact.py           # Contact SQLAlchemy model
│   ├── lead.py              # Lead SQLAlchemy model
│   ├── opportunity.py       # Opportunity SQLAlchemy model
│   ├── pipeline.py          # Pipeline SQLAlchemy model
│   ├── stage.py             # Stage SQLAlchemy model
│   └── tag.py               # Tag SQLAlchemy model
├── schemas/
│   ├── __init__.py
│   └── *.py                 # Pydantic schemas for each entity
├── services/
│   └── *.py                 # Business logic services
└── data/
    └── demo.json            # Demo/seed data
```

### Frontend Structure

```
frontend/apps/web-fastvue/src/
├── api/crm/
│   └── index.ts             # TypeScript API client with types
├── router/routes/modules/
│   └── crm.ts               # Vue Router route definitions
└── views/crm/
    ├── dashboard/
    │   └── index.vue        # CRM Dashboard with KPIs
    ├── leads/
    │   └── index.vue        # Leads list + Kanban view
    ├── opportunities/
    │   └── index.vue        # Opportunities + Pipeline view
    ├── contacts/
    │   └── index.vue        # Contacts management
    ├── accounts/
    │   └── index.vue        # Accounts management
    ├── activities/
    │   └── index.vue        # Activity log
    └── settings/
        └── pipelines.vue    # Pipeline configuration
```

## API Reference

### Base URL

All CRM endpoints are prefixed with `/api/v1/crm/`

### Leads API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leads/` | List leads with pagination and filters |
| POST | `/leads/` | Create a new lead |
| GET | `/leads/{id}` | Get lead by ID |
| PUT | `/leads/{id}` | Update lead |
| DELETE | `/leads/{id}` | Delete lead |
| GET | `/leads/kanban` | Get leads grouped by stage (Kanban view) |
| POST | `/leads/{id}/move-stage` | Move lead to different stage |
| POST | `/leads/{id}/convert` | Convert lead to opportunity/contact/account |
| POST | `/leads/{id}/mark-lost` | Mark lead as lost |

#### Lead Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Lead name/title |
| `contact_name` | string | No | Contact person name |
| `email` | string | No | Contact email |
| `phone` | string | No | Contact phone |
| `company_name` | string | No | Company name |
| `job_title` | string | No | Contact job title |
| `pipeline_id` | integer | No | Pipeline ID (uses default if not set) |
| `stage_id` | integer | No | Stage ID (uses first stage if not set) |
| `priority` | enum | No | low, medium, high, urgent |
| `rating` | enum | No | cold, warm, hot |
| `source` | enum | No | website, referral, cold_call, etc. |
| `expected_revenue` | decimal | No | Expected deal value |
| `probability` | integer | No | Win probability (0-100) |

### Opportunities API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/opportunities/` | List opportunities |
| POST | `/opportunities/` | Create opportunity |
| GET | `/opportunities/{id}` | Get opportunity by ID |
| PUT | `/opportunities/{id}` | Update opportunity |
| DELETE | `/opportunities/{id}` | Delete opportunity |
| GET | `/opportunities/kanban` | Kanban view by stage |
| POST | `/opportunities/{id}/move-stage` | Move to different stage |
| POST | `/opportunities/{id}/mark-won` | Mark as won |
| POST | `/opportunities/{id}/mark-lost` | Mark as lost |
| GET | `/opportunities/forecast` | Get sales forecast |

#### Opportunity Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Opportunity name |
| `account_id` | integer | No | Related account |
| `contact_id` | integer | No | Primary contact |
| `pipeline_id` | integer | No | Pipeline ID |
| `stage_id` | integer | No | Current stage |
| `amount` | decimal | No | Deal amount |
| `probability` | integer | No | Win probability |
| `close_date` | date | No | Expected close date |
| `opportunity_type` | enum | No | new_business, renewal, upsell, etc. |
| `priority` | enum | No | low, medium, high, urgent |

### Contacts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contacts/` | List contacts |
| POST | `/contacts/` | Create contact |
| GET | `/contacts/{id}` | Get contact by ID |
| PUT | `/contacts/{id}` | Update contact |
| DELETE | `/contacts/{id}` | Delete contact |

#### Contact Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | First name |
| `last_name` | string | No | Last name |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `mobile` | string | No | Mobile number |
| `job_title` | string | No | Job title |
| `department` | string | No | Department |
| `account_id` | integer | No | Related account |
| `is_primary` | boolean | No | Primary contact for account |
| `do_not_call` | boolean | No | Do not call flag |
| `email_opt_out` | boolean | No | Email opt-out flag |

### Accounts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts/` | List accounts |
| POST | `/accounts/` | Create account |
| GET | `/accounts/{id}` | Get account by ID |
| PUT | `/accounts/{id}` | Update account |
| DELETE | `/accounts/{id}` | Delete account |

#### Account Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Account name |
| `website` | string | No | Company website |
| `phone` | string | No | Main phone |
| `account_type` | enum | No | prospect, customer, partner, vendor, competitor |
| `industry` | enum | No | technology, finance, healthcare, etc. |
| `rating` | enum | No | cold, warm, hot |
| `employees` | integer | No | Number of employees |
| `annual_revenue` | decimal | No | Annual revenue |
| `billing_street` | string | No | Billing address |
| `billing_city` | string | No | City |
| `billing_state` | string | No | State/Province |
| `billing_zip` | string | No | ZIP/Postal code |
| `billing_country` | string | No | Country |

### Activities API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities/` | List activities |
| POST | `/activities/` | Create activity |
| GET | `/activities/{id}` | Get activity by ID |
| PUT | `/activities/{id}` | Update activity |
| DELETE | `/activities/{id}` | Delete activity |

#### Activity Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | Activity subject |
| `activity_type` | enum | Yes | call, meeting, task, email, note |
| `description` | string | No | Activity details |
| `due_date` | datetime | No | Due date/time |
| `completed_at` | datetime | No | Completion time |
| `status` | enum | No | scheduled, in_progress, completed, cancelled |
| `priority` | enum | No | low, medium, high, urgent |
| `lead_id` | integer | No | Related lead |
| `opportunity_id` | integer | No | Related opportunity |
| `contact_id` | integer | No | Related contact |
| `account_id` | integer | No | Related account |

### Pipelines API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pipelines/` | List pipelines |
| POST | `/pipelines/` | Create pipeline |
| GET | `/pipelines/{id}` | Get pipeline with stages |
| PUT | `/pipelines/{id}` | Update pipeline |
| DELETE | `/pipelines/{id}` | Delete pipeline |

### Stages API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stages/` | List stages |
| POST | `/stages/` | Create stage |
| GET | `/stages/{id}` | Get stage by ID |
| PUT | `/stages/{id}` | Update stage |
| DELETE | `/stages/{id}` | Delete stage |

## Frontend Views

### Dashboard (`/crm/dashboard`)

The CRM dashboard displays key performance indicators:

- **Total Leads**: Count of active leads
- **Total Opportunities**: Count and total value
- **Won Deals**: Count and value of won opportunities
- **Conversion Rate**: Lead to opportunity conversion %
- **Pipeline Distribution**: Chart showing opportunities by stage

### Leads View (`/crm/leads`)

Features:
- **Table View**: Sortable, filterable list of leads
- **Kanban View**: Drag-and-drop board by pipeline stage
- **Filters**: Pipeline, stage, priority, rating, source
- **Actions**: Create, edit, convert to opportunity, mark as lost
- **Bulk Operations**: Multi-select for batch updates

### Opportunities View (`/crm/opportunities`)

Features:
- **Table View**: List with deal values and probabilities
- **Kanban View**: Visual pipeline board
- **Filters**: Pipeline, stage, account, priority
- **Actions**: Create, edit, mark won/lost
- **Forecast**: Revenue forecast based on probability

### Contacts View (`/crm/contacts`)

Features:
- **Contact List**: Table with avatar, name, email, phone
- **Search**: Full-text search across name, email, phone
- **Filters**: By account, active status
- **Quick Actions**: Call, email, view details

### Accounts View (`/crm/accounts`)

Features:
- **Account List**: Companies with type, industry, rating
- **Aggregates**: Contact count, opportunity count, total value
- **Filters**: Account type, industry, rating
- **Related Data**: View linked contacts and opportunities

### Activities View (`/crm/activities`)

Features:
- **Activity Log**: Chronological list of all activities
- **Filters**: Type, status, date range
- **Quick Log**: Fast activity creation
- **Related Records**: Link to leads, opportunities, contacts

### Pipeline Settings (`/crm/settings/pipelines`)

Features:
- **Pipeline Management**: Create, edit, delete pipelines
- **Stage Configuration**: Add/edit stages with sequence, probability, color
- **Default Pipeline**: Set default for new leads/opportunities
- **Stage Types**: Mark stages as won/lost for reporting

## Demo Data

The CRM module includes demo data for testing and evaluation:

### Pipelines
- **Sales Pipeline** (default): 6 stages (New, Qualified, Proposal, Negotiation, Won, Lost)
- **Enterprise Deals**: For large enterprise opportunities

### Sample Data
- 5 Accounts (Acme Corp, Global Industries, Tech Innovators, MedHealth, EduLearn)
- 5 Contacts (linked to accounts)
- 5 Leads (various stages and priorities)
- 4 Opportunities (different stages and values)
- 8 Tags (High Value, Enterprise, SMB, etc.)

### Loading Demo Data

```bash
cd backend
source venv/bin/activate

# Load all demo data including CRM
python manage.py load-data

# Or load CRM demo data specifically
python manage.py load-data --file modules/crm/data/demo.json
```

## Module Installation

The CRM module is installed via the module system:

```bash
# Via API
POST /api/v1/modules/install/crm

# Or automatically on first startup if enabled in settings
```

### Manifest Configuration

The module manifest (`__manifest__.py`) defines:

```python
{
    "name": "crm",
    "display_name": "CRM",
    "version": "1.0.0",
    "description": "Customer Relationship Management",
    "category": "Sales",
    "depends": ["base"],
    "auto_install": False,
    "installable": True,
    "menus": [
        {"name": "CRM", "icon": "mdi:account-group", "sequence": 20},
        {"name": "Dashboard", "parent": "CRM", "path": "/crm/dashboard"},
        {"name": "Leads", "parent": "CRM", "path": "/crm/leads"},
        # ... more menu items
    ],
}
```

## Customization

### Adding Custom Fields

To add custom fields to CRM entities:

1. Create an Alembic migration:
```bash
python manage.py makemigrations -m "add_custom_field_to_lead"
```

2. Update the SQLAlchemy model in `models/lead.py`
3. Update the Pydantic schema in `schemas/lead.py`
4. Update the frontend TypeScript types in `api/crm/index.ts`
5. Update the form components in the view

### Custom Pipeline Stages

Pipelines and stages are fully customizable through the UI or API:

1. Navigate to CRM > Pipeline Settings
2. Create a new pipeline or edit existing
3. Add stages with sequence, probability, and color
4. Mark closing stages as "Won" or "Lost"

### Integration with Other Modules

The CRM module can integrate with:

- **Activity Logging**: All CRM actions are logged automatically
- **Messages**: Attach messages/notes to CRM records
- **Notifications**: Trigger notifications on stage changes
- **Access Control**: Role-based permissions on CRM entities

## Best Practices

### Lead Management
1. Define clear qualification criteria
2. Use consistent lead sources
3. Set realistic probabilities
4. Follow up on leads promptly

### Pipeline Management
1. Keep pipeline stages simple (5-7 stages)
2. Define clear exit criteria for each stage
3. Use probability percentages aligned with historical data
4. Regularly review and clean stale opportunities

### Data Quality
1. Require minimum fields on creation
2. Link contacts to accounts
3. Log activities for all customer interactions
4. Use tags for quick categorization

## Troubleshooting

### Common Issues

**Leads not appearing in Kanban view**
- Ensure the lead has a valid pipeline_id and stage_id
- Check that the pipeline is active

**Conversion failing**
- Verify the target account doesn't already exist (if creating)
- Check required fields are populated

**Activities not linking**
- Ensure the related record ID exists
- Check foreign key constraints

### Logging

Enable debug logging for CRM:

```python
# In backend/app/core/config.py
LOGGING_LEVEL = "DEBUG"
```

Check logs at `backend/logs/app.log` or Docker logs.
