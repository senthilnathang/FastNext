"""
CRM Demo Data Loader

Load demo data into the CRM module.
"""

import json
import logging
from decimal import Decimal
from pathlib import Path
from typing import Dict, Optional

from sqlalchemy.orm import Session

from ..models import (
    Pipeline, Stage, Tag, Lead, Opportunity, Contact, Account,
    LeadPriority, LeadRating, LeadSource,
    OpportunityType, OpportunityPriority,
    AccountType, AccountRating, Industry,
)

logger = logging.getLogger(__name__)


def load_demo_data(db: Session, company_id: int, user_id: int) -> Dict[str, int]:
    """
    Load demo data for the CRM module.

    Args:
        db: Database session
        company_id: Company ID to associate data with
        user_id: User ID for created_by

    Returns:
        Dict with counts of created records
    """
    data_path = Path(__file__).parent / "demo.json"

    with open(data_path, "r") as f:
        data = json.load(f)

    counts = {
        "pipelines": 0,
        "stages": 0,
        "tags": 0,
        "accounts": 0,
        "contacts": 0,
        "leads": 0,
        "opportunities": 0,
    }

    # Maps for lookups
    pipeline_map: Dict[str, Pipeline] = {}
    stage_map: Dict[str, Stage] = {}
    tag_map: Dict[str, Tag] = {}
    account_map: Dict[str, Account] = {}
    contact_map: Dict[str, Contact] = {}

    # Load pipelines
    for p_data in data.get("pipelines", []):
        pipeline = Pipeline(
            name=p_data["name"],
            description=p_data.get("description"),
            is_default=p_data.get("is_default", False),
            is_active=p_data.get("is_active", True),
            company_id=company_id,
            created_by_id=user_id,
        )
        db.add(pipeline)
        db.flush()
        pipeline_map[pipeline.name] = pipeline
        counts["pipelines"] += 1

    # Load stages
    for s_data in data.get("stages", []):
        pipeline = pipeline_map.get(s_data["pipeline"])
        if not pipeline:
            continue

        stage = Stage(
            name=s_data["name"],
            pipeline_id=pipeline.id,
            sequence=s_data.get("sequence", 10),
            probability=s_data.get("probability", 10),
            color=s_data.get("color", "#3498db"),
            description=s_data.get("description"),
            is_won=s_data.get("is_won", False),
            is_lost=s_data.get("is_lost", False),
            company_id=company_id,
            created_by_id=user_id,
        )
        db.add(stage)
        db.flush()
        stage_map[stage.name] = stage
        counts["stages"] += 1

    # Load tags
    for t_data in data.get("tags", []):
        tag = Tag(
            name=t_data["name"],
            color=t_data.get("color", "#3498db"),
            company_id=company_id,
            created_by_id=user_id,
        )
        db.add(tag)
        db.flush()
        tag_map[tag.name] = tag
        counts["tags"] += 1

    # Load accounts
    for a_data in data.get("accounts", []):
        account_type = AccountType(a_data.get("account_type", "prospect"))
        rating = AccountRating(a_data.get("rating", "warm"))
        industry = Industry(a_data["industry"]) if a_data.get("industry") else None

        account = Account(
            name=a_data["name"],
            website=a_data.get("website"),
            phone=a_data.get("phone"),
            account_type=account_type,
            industry=industry,
            rating=rating,
            employees=a_data.get("employees"),
            annual_revenue=Decimal(str(a_data["annual_revenue"])) if a_data.get("annual_revenue") else None,
            billing_city=a_data.get("billing_city"),
            billing_state=a_data.get("billing_state"),
            billing_country=a_data.get("billing_country"),
            company_id=company_id,
            user_id=user_id,
            created_by_id=user_id,
        )
        db.add(account)
        db.flush()
        account_map[account.name] = account
        counts["accounts"] += 1

    # Load contacts
    for c_data in data.get("contacts", []):
        account = account_map.get(c_data.get("account"))

        contact = Contact(
            first_name=c_data["first_name"],
            last_name=c_data.get("last_name"),
            email=c_data.get("email"),
            phone=c_data.get("phone"),
            job_title=c_data.get("job_title"),
            is_primary=c_data.get("is_primary", False),
            account_id=account.id if account else None,
            company_id=company_id,
            user_id=user_id,
            created_by_id=user_id,
        )
        db.add(contact)
        db.flush()
        contact_key = f"{contact.first_name} {contact.last_name or ''}".strip()
        contact_map[contact_key] = contact
        counts["contacts"] += 1

    # Load leads
    default_pipeline = pipeline_map.get("Sales Pipeline")
    for l_data in data.get("leads", []):
        stage = stage_map.get(l_data.get("stage"))
        priority = LeadPriority(l_data.get("priority", "medium"))
        rating = LeadRating(l_data.get("rating", "warm"))
        source = LeadSource(l_data.get("source", "website"))

        lead = Lead(
            name=l_data["name"],
            contact_name=l_data.get("contact_name"),
            email=l_data.get("email"),
            phone=l_data.get("phone"),
            company_name=l_data.get("company_name"),
            job_title=l_data.get("job_title"),
            pipeline_id=default_pipeline.id if default_pipeline else None,
            stage_id=stage.id if stage else None,
            priority=priority,
            rating=rating,
            source=source,
            expected_revenue=Decimal(str(l_data["expected_revenue"])) if l_data.get("expected_revenue") else None,
            probability=l_data.get("probability", 10),
            company_id=company_id,
            user_id=user_id,
            created_by_id=user_id,
        )
        db.add(lead)
        counts["leads"] += 1

    # Load opportunities
    for o_data in data.get("opportunities", []):
        account = account_map.get(o_data.get("account"))
        contact = contact_map.get(o_data.get("contact"))
        stage = stage_map.get(o_data.get("stage"))
        opp_type = OpportunityType(o_data.get("opportunity_type", "new_business"))
        priority = OpportunityPriority(o_data.get("priority", "medium"))

        opportunity = Opportunity(
            name=o_data["name"],
            account_id=account.id if account else None,
            contact_id=contact.id if contact else None,
            pipeline_id=default_pipeline.id if default_pipeline else None,
            stage_id=stage.id if stage else None,
            amount=Decimal(str(o_data["amount"])) if o_data.get("amount") else Decimal(0),
            probability=o_data.get("probability", 10),
            opportunity_type=opp_type,
            priority=priority,
            company_id=company_id,
            user_id=user_id,
            created_by_id=user_id,
        )
        opportunity.update_expected_revenue()
        db.add(opportunity)
        counts["opportunities"] += 1

    db.commit()

    logger.info(f"Loaded CRM demo data: {counts}")
    return counts


def clear_demo_data(db: Session, company_id: int) -> Dict[str, int]:
    """
    Clear all CRM data for a company.

    Args:
        db: Database session
        company_id: Company ID to clear data for

    Returns:
        Dict with counts of deleted records
    """
    counts = {
        "opportunities": db.query(Opportunity).filter(Opportunity.company_id == company_id).delete(),
        "leads": db.query(Lead).filter(Lead.company_id == company_id).delete(),
        "contacts": db.query(Contact).filter(Contact.company_id == company_id).delete(),
        "accounts": db.query(Account).filter(Account.company_id == company_id).delete(),
        "tags": db.query(Tag).filter(Tag.company_id == company_id).delete(),
        "stages": db.query(Stage).filter(Stage.company_id == company_id).delete(),
        "pipelines": db.query(Pipeline).filter(Pipeline.company_id == company_id).delete(),
    }

    db.commit()

    logger.info(f"Cleared CRM demo data: {counts}")
    return counts
