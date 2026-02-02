"""
Interview Service

Business logic for interview scheduling and management.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from ..models.interview import (
    InterviewSchedule, InterviewScorecardTemplate, InterviewFeedback,
    InterviewAvailability, InterviewQuestion, Competency, InterviewKit,
    InterviewKitQuestion, CompetencyRating, InterviewGuide
)
from ..models.recruitment import Candidate


class InterviewService:
    """Service for interview operations."""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # Interview Schedule Operations
    # =========================================================================

    def list_interviews(
        self,
        company_id: int,
        candidate_id: Optional[int] = None,
        interview_type: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        interviewer_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[InterviewSchedule], int]:
        """List interviews with pagination and filters."""
        query = self.db.query(InterviewSchedule).filter(
            InterviewSchedule.company_id == company_id,
            InterviewSchedule.is_deleted == False,
        )

        if candidate_id:
            query = query.filter(InterviewSchedule.candidate_id == candidate_id)
        if interview_type:
            query = query.filter(InterviewSchedule.interview_type == interview_type)
        if status:
            query = query.filter(InterviewSchedule.status == status)
        if start_date:
            query = query.filter(InterviewSchedule.interview_date >= start_date)
        if end_date:
            query = query.filter(InterviewSchedule.interview_date <= end_date)
        if interviewer_id:
            query = query.join(InterviewSchedule.interviewers).filter(
                InterviewSchedule.interviewers.any(id=interviewer_id)
            )

        total = query.count()
        interviews = query.order_by(
            InterviewSchedule.interview_date.desc(),
            InterviewSchedule.interview_time.desc()
        ).offset(skip).limit(limit).all()
        return interviews, total

    def get_interview(
        self, interview_id: int, company_id: int
    ) -> Optional[InterviewSchedule]:
        """Get interview by ID."""
        return self.db.query(InterviewSchedule).filter(
            InterviewSchedule.id == interview_id,
            InterviewSchedule.company_id == company_id,
            InterviewSchedule.is_deleted == False,
        ).first()

    def get_candidate_interviews(
        self, candidate_id: int, company_id: int
    ) -> List[InterviewSchedule]:
        """Get all interviews for a candidate."""
        return self.db.query(InterviewSchedule).filter(
            InterviewSchedule.candidate_id == candidate_id,
            InterviewSchedule.company_id == company_id,
            InterviewSchedule.is_deleted == False,
        ).order_by(InterviewSchedule.interview_date, InterviewSchedule.interview_time).all()

    def create_interview(
        self,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> InterviewSchedule:
        """Create a new interview."""
        interview = InterviewSchedule(
            candidate_id=data['candidate_id'],
            interview_date=data['interview_date'],
            interview_time=data['interview_time'],
            end_time=data.get('end_time'),
            description=data.get('description'),
            interview_type=data.get('interview_type', 'technical'),
            status=data.get('status', 'scheduled'),
            round_number=data.get('round_number', 1),
            duration_minutes=data.get('duration_minutes', 60),
            location=data.get('location'),
            meeting_link=data.get('meeting_link'),
            meeting_id=data.get('meeting_id'),
            meeting_password=data.get('meeting_password'),
            timezone=data.get('timezone', 'UTC'),
            scorecard_template_id=data.get('scorecard_template_id'),
            interview_kit=data.get('interview_kit'),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(interview)
        self.db.flush()

        # Add interviewers if provided
        if data.get('interviewer_ids'):
            from modules.employee.models.employee import Employee
            interviewers = self.db.query(Employee).filter(
                Employee.id.in_(data['interviewer_ids']),
                Employee.company_id == company_id,
            ).all()
            interview.interviewers = interviewers

        self.db.commit()
        self.db.refresh(interview)
        return interview

    def update_interview(
        self,
        interview_id: int,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Optional[InterviewSchedule]:
        """Update an interview."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return None

        update_fields = [
            'interview_date', 'interview_time', 'end_time', 'description',
            'interview_type', 'status', 'round_number', 'duration_minutes',
            'location', 'meeting_link', 'meeting_id', 'meeting_password',
            'timezone', 'scorecard_template_id', 'interview_kit',
            'overall_rating', 'overall_feedback', 'next_steps',
            'strengths', 'areas_of_improvement', 'result'
        ]

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(interview, field, data[field])

        # Update interviewers if provided
        if 'interviewer_ids' in data:
            from modules.employee.models.employee import Employee
            interviewers = self.db.query(Employee).filter(
                Employee.id.in_(data['interviewer_ids']),
                Employee.company_id == company_id,
            ).all()
            interview.interviewers = interviewers

        interview.updated_by = user_id
        self.db.commit()
        self.db.refresh(interview)
        return interview

    def delete_interview(
        self, interview_id: int, company_id: int, user_id: int
    ) -> bool:
        """Soft delete an interview."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return False

        interview.is_deleted = True
        interview.deleted_by = user_id
        interview.deleted_at = datetime.utcnow()
        self.db.commit()
        return True

    def reschedule_interview(
        self,
        interview_id: int,
        new_date: date,
        new_time: time,
        company_id: int,
        user_id: int,
        reason: Optional[str] = None
    ) -> Optional[InterviewSchedule]:
        """Reschedule an interview."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return None

        # Create new interview as rescheduled
        new_interview = InterviewSchedule(
            candidate_id=interview.candidate_id,
            interview_date=new_date,
            interview_time=new_time,
            end_time=interview.end_time,
            description=interview.description,
            interview_type=interview.interview_type,
            status='scheduled',
            round_number=interview.round_number,
            duration_minutes=interview.duration_minutes,
            location=interview.location,
            meeting_link=interview.meeting_link,
            scorecard_template_id=interview.scorecard_template_id,
            timezone=interview.timezone,
            rescheduled_from_id=interview.id,
            reschedule_reason=reason,
            reschedule_count=interview.reschedule_count + 1,
            company_id=company_id,
            created_by=user_id,
        )
        new_interview.interviewers = interview.interviewers

        # Update old interview
        interview.status = 'rescheduled'
        interview.updated_by = user_id

        self.db.add(new_interview)
        self.db.commit()
        self.db.refresh(new_interview)
        return new_interview

    def complete_interview(
        self,
        interview_id: int,
        company_id: int,
        user_id: int,
        result: Optional[str] = None,
        overall_feedback: Optional[str] = None
    ) -> Optional[InterviewSchedule]:
        """Mark interview as completed."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return None

        interview.status = 'completed'
        interview.completed = True
        if result:
            interview.result = result
        if overall_feedback:
            interview.overall_feedback = overall_feedback
        interview.updated_by = user_id

        self.db.commit()
        self.db.refresh(interview)
        return interview

    def cancel_interview(
        self,
        interview_id: int,
        company_id: int,
        user_id: int,
        reason: Optional[str] = None
    ) -> Optional[InterviewSchedule]:
        """Cancel an interview."""
        interview = self.get_interview(interview_id, company_id)
        if not interview:
            return None

        interview.status = 'cancelled'
        if reason:
            interview.reschedule_reason = reason
        interview.updated_by = user_id

        self.db.commit()
        self.db.refresh(interview)
        return interview

    # =========================================================================
    # Interview Feedback Operations
    # =========================================================================

    def add_feedback(
        self,
        interview_id: int,
        interviewer_id: int,
        data: Dict[str, Any],
        company_id: int
    ) -> InterviewFeedback:
        """Add feedback for an interview."""
        feedback = InterviewFeedback(
            interview_id=interview_id,
            interviewer_id=interviewer_id,
            overall_rating=data['overall_rating'],
            recommendation=data['recommendation'],
            feedback=data['feedback'],
            strengths=data.get('strengths'),
            weaknesses=data.get('weaknesses'),
            notes=data.get('notes'),
            criteria_scores=data.get('criteria_scores', {}),
            submitted_at=datetime.utcnow(),
            company_id=company_id,
        )
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)

        # Update interview overall rating
        self._update_interview_rating(interview_id)

        return feedback

    def get_interview_feedbacks(
        self, interview_id: int, company_id: int
    ) -> List[InterviewFeedback]:
        """Get all feedbacks for an interview."""
        return self.db.query(InterviewFeedback).filter(
            InterviewFeedback.interview_id == interview_id,
            InterviewFeedback.company_id == company_id,
            InterviewFeedback.is_deleted == False,
        ).all()

    def update_feedback(
        self,
        feedback_id: int,
        data: Dict[str, Any],
        company_id: int
    ) -> Optional[InterviewFeedback]:
        """Update interview feedback."""
        feedback = self.db.query(InterviewFeedback).filter(
            InterviewFeedback.id == feedback_id,
            InterviewFeedback.company_id == company_id,
            InterviewFeedback.is_deleted == False,
        ).first()

        if not feedback:
            return None

        update_fields = [
            'overall_rating', 'recommendation', 'feedback',
            'strengths', 'weaknesses', 'notes', 'criteria_scores'
        ]

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(feedback, field, data[field])

        self.db.commit()
        self.db.refresh(feedback)

        # Update interview overall rating
        self._update_interview_rating(feedback.interview_id)

        return feedback

    def _update_interview_rating(self, interview_id: int) -> None:
        """Update interview's overall rating based on feedbacks."""
        avg_rating = self.db.query(func.avg(InterviewFeedback.overall_rating)).filter(
            InterviewFeedback.interview_id == interview_id,
            InterviewFeedback.is_deleted == False,
        ).scalar()

        if avg_rating:
            interview = self.db.query(InterviewSchedule).filter(
                InterviewSchedule.id == interview_id
            ).first()
            if interview:
                interview.overall_rating = Decimal(str(avg_rating))
                self.db.commit()

    # =========================================================================
    # Interviewer Availability Operations
    # =========================================================================

    def list_availability(
        self,
        company_id: int,
        employee_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[InterviewAvailability], int]:
        """List interviewer availability slots."""
        query = self.db.query(InterviewAvailability).filter(
            InterviewAvailability.company_id == company_id,
            InterviewAvailability.is_deleted == False,
        )

        if employee_id:
            query = query.filter(InterviewAvailability.employee_id == employee_id)
        if start_date:
            query = query.filter(InterviewAvailability.date >= start_date)
        if end_date:
            query = query.filter(InterviewAvailability.date <= end_date)
        if status:
            query = query.filter(InterviewAvailability.status == status)

        total = query.count()
        slots = query.order_by(
            InterviewAvailability.date,
            InterviewAvailability.start_time
        ).offset(skip).limit(limit).all()
        return slots, total

    def create_availability(
        self,
        employee_id: int,
        data: Dict[str, Any],
        company_id: int
    ) -> InterviewAvailability:
        """Create an availability slot."""
        slot = InterviewAvailability(
            employee_id=employee_id,
            date=data['date'],
            start_time=data['start_time'],
            end_time=data['end_time'],
            status=data.get('status', 'available'),
            interview_types=data.get('interview_types', []),
            notes=data.get('notes'),
            recurring=data.get('recurring', False),
            recurring_pattern=data.get('recurring_pattern'),
            company_id=company_id,
        )
        self.db.add(slot)
        self.db.commit()
        self.db.refresh(slot)
        return slot

    def update_availability(
        self,
        availability_id: int,
        data: Dict[str, Any],
        company_id: int
    ) -> Optional[InterviewAvailability]:
        """Update an availability slot."""
        slot = self.db.query(InterviewAvailability).filter(
            InterviewAvailability.id == availability_id,
            InterviewAvailability.company_id == company_id,
            InterviewAvailability.is_deleted == False,
        ).first()

        if not slot:
            return None

        update_fields = [
            'date', 'start_time', 'end_time', 'status',
            'interview_types', 'notes', 'recurring', 'recurring_pattern'
        ]

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(slot, field, data[field])

        self.db.commit()
        self.db.refresh(slot)
        return slot

    def delete_availability(
        self, availability_id: int, company_id: int
    ) -> bool:
        """Delete an availability slot."""
        slot = self.db.query(InterviewAvailability).filter(
            InterviewAvailability.id == availability_id,
            InterviewAvailability.company_id == company_id,
        ).first()

        if not slot:
            return False

        slot.is_deleted = True
        self.db.commit()
        return True

    # =========================================================================
    # Interview Question Bank Operations
    # =========================================================================

    def list_questions(
        self,
        company_id: int,
        interview_type: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        job_position_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[InterviewQuestion], int]:
        """List interview questions."""
        query = self.db.query(InterviewQuestion).filter(
            InterviewQuestion.company_id == company_id,
            InterviewQuestion.is_deleted == False,
            InterviewQuestion.is_active == True,
        )

        if interview_type:
            query = query.filter(InterviewQuestion.interview_type == interview_type)
        if category:
            query = query.filter(InterviewQuestion.category == category)
        if difficulty:
            query = query.filter(InterviewQuestion.difficulty == difficulty)
        if job_position_id:
            query = query.filter(InterviewQuestion.job_position_id == job_position_id)

        total = query.count()
        questions = query.order_by(InterviewQuestion.created_at.desc()).offset(skip).limit(limit).all()
        return questions, total

    def create_question(
        self,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> InterviewQuestion:
        """Create an interview question."""
        question = InterviewQuestion(
            question=data['question'],
            answer_guide=data.get('answer_guide'),
            interview_type=data['interview_type'],
            category=data.get('category'),
            difficulty=data.get('difficulty', 'medium'),
            skills=data.get('skills', []),
            time_estimate_minutes=data.get('time_estimate_minutes'),
            job_position_id=data.get('job_position_id'),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)
        return question

    def update_question(
        self,
        question_id: int,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Optional[InterviewQuestion]:
        """Update an interview question."""
        question = self.db.query(InterviewQuestion).filter(
            InterviewQuestion.id == question_id,
            InterviewQuestion.company_id == company_id,
            InterviewQuestion.is_deleted == False,
        ).first()

        if not question:
            return None

        update_fields = [
            'question', 'answer_guide', 'interview_type', 'category',
            'difficulty', 'skills', 'time_estimate_minutes', 'job_position_id', 'is_active'
        ]

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(question, field, data[field])

        question.updated_by = user_id
        self.db.commit()
        self.db.refresh(question)
        return question

    def delete_question(
        self, question_id: int, company_id: int, user_id: int
    ) -> bool:
        """Soft delete an interview question."""
        question = self.db.query(InterviewQuestion).filter(
            InterviewQuestion.id == question_id,
            InterviewQuestion.company_id == company_id,
        ).first()

        if not question:
            return False

        question.is_deleted = True
        question.deleted_by = user_id
        question.deleted_at = datetime.utcnow()
        self.db.commit()
        return True

    # =========================================================================
    # Scorecard Template Operations
    # =========================================================================

    def list_scorecard_templates(
        self,
        company_id: int,
        interview_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[InterviewScorecardTemplate], int]:
        """List scorecard templates."""
        query = self.db.query(InterviewScorecardTemplate).filter(
            InterviewScorecardTemplate.company_id == company_id,
            InterviewScorecardTemplate.is_deleted == False,
            InterviewScorecardTemplate.is_active == True,
        )

        if interview_type:
            query = query.filter(InterviewScorecardTemplate.interview_type == interview_type)

        total = query.count()
        templates = query.order_by(InterviewScorecardTemplate.name).offset(skip).limit(limit).all()
        return templates, total

    def get_scorecard_template(
        self, template_id: int, company_id: int
    ) -> Optional[InterviewScorecardTemplate]:
        """Get scorecard template by ID."""
        return self.db.query(InterviewScorecardTemplate).filter(
            InterviewScorecardTemplate.id == template_id,
            InterviewScorecardTemplate.company_id == company_id,
            InterviewScorecardTemplate.is_deleted == False,
        ).first()

    def create_scorecard_template(
        self,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> InterviewScorecardTemplate:
        """Create a scorecard template."""
        template = InterviewScorecardTemplate(
            name=data['name'],
            description=data.get('description'),
            interview_type=data.get('interview_type'),
            criteria=data.get('criteria', []),
            passing_score=data.get('passing_score'),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def update_scorecard_template(
        self,
        template_id: int,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Optional[InterviewScorecardTemplate]:
        """Update a scorecard template."""
        template = self.get_scorecard_template(template_id, company_id)
        if not template:
            return None

        update_fields = ['name', 'description', 'interview_type', 'criteria', 'passing_score', 'is_active']

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(template, field, data[field])

        template.updated_by = user_id
        self.db.commit()
        self.db.refresh(template)
        return template

    # =========================================================================
    # Competency Operations
    # =========================================================================

    def list_competencies(
        self,
        company_id: int,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Competency], int]:
        """List competencies."""
        query = self.db.query(Competency).filter(
            Competency.company_id == company_id,
            Competency.is_deleted == False,
            Competency.is_active == True,
        )

        if category:
            query = query.filter(Competency.category == category)

        total = query.count()
        competencies = query.order_by(Competency.name).offset(skip).limit(limit).all()
        return competencies, total

    def create_competency(
        self,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Competency:
        """Create a competency."""
        competency = Competency(
            name=data['name'],
            description=data.get('description'),
            category=data.get('category', 'technical'),
            rating_scale=data.get('rating_scale', []),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(competency)
        self.db.commit()
        self.db.refresh(competency)
        return competency

    def add_competency_rating(
        self,
        candidate_id: int,
        competency_id: int,
        interview_id: int,
        rating: int,
        rated_by_id: int,
        notes: Optional[str] = None
    ) -> CompetencyRating:
        """Add a competency rating for a candidate."""
        comp_rating = CompetencyRating(
            candidate_id=candidate_id,
            competency_id=competency_id,
            interview_id=interview_id,
            rating=rating,
            notes=notes,
            rated_by_id=rated_by_id,
            rated_at=datetime.utcnow(),
        )
        self.db.add(comp_rating)
        self.db.commit()
        self.db.refresh(comp_rating)
        return comp_rating

    # =========================================================================
    # Interview Kit Operations
    # =========================================================================

    def list_interview_kits(
        self,
        company_id: int,
        interview_type: Optional[str] = None,
        job_position_id: Optional[int] = None,
        department_id: Optional[int] = None,
        is_template: Optional[bool] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[InterviewKit], int]:
        """List interview kits."""
        query = self.db.query(InterviewKit).filter(
            InterviewKit.company_id == company_id,
            InterviewKit.is_deleted == False,
            InterviewKit.is_active == True,
        )

        if interview_type:
            query = query.filter(InterviewKit.interview_type == interview_type)
        if job_position_id:
            query = query.filter(InterviewKit.job_position_id == job_position_id)
        if department_id:
            query = query.filter(InterviewKit.department_id == department_id)
        if is_template is not None:
            query = query.filter(InterviewKit.is_template == is_template)

        total = query.count()
        kits = query.order_by(InterviewKit.name).offset(skip).limit(limit).all()
        return kits, total

    def get_interview_kit(
        self, kit_id: int, company_id: int
    ) -> Optional[InterviewKit]:
        """Get interview kit by ID."""
        return self.db.query(InterviewKit).filter(
            InterviewKit.id == kit_id,
            InterviewKit.company_id == company_id,
            InterviewKit.is_deleted == False,
        ).first()

    def create_interview_kit(
        self,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> InterviewKit:
        """Create an interview kit."""
        kit = InterviewKit(
            name=data['name'],
            description=data.get('description'),
            job_position_id=data.get('job_position_id'),
            department_id=data.get('department_id'),
            interview_type=data.get('interview_type', 'technical'),
            duration_minutes=data.get('duration_minutes', 60),
            is_template=data.get('is_template', False),
            created_by_id=user_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(kit)
        self.db.flush()

        # Add competencies if provided
        if data.get('competency_ids'):
            competencies = self.db.query(Competency).filter(
                Competency.id.in_(data['competency_ids']),
                Competency.company_id == company_id,
            ).all()
            kit.competencies = competencies

        # Add questions if provided
        if data.get('questions'):
            for q_data in data['questions']:
                kit_question = InterviewKitQuestion(
                    kit_id=kit.id,
                    question=q_data['question'],
                    question_type=q_data.get('question_type', 'general'),
                    purpose=q_data.get('purpose'),
                    good_answer_hints=q_data.get('good_answer_hints'),
                    red_flags=q_data.get('red_flags'),
                    competency_id=q_data.get('competency_id'),
                    sequence=q_data.get('sequence', 0),
                    time_allocation_minutes=q_data.get('time_allocation_minutes', 5),
                    is_required=q_data.get('is_required', False),
                )
                self.db.add(kit_question)

        self.db.commit()
        self.db.refresh(kit)
        return kit

    def update_interview_kit(
        self,
        kit_id: int,
        data: Dict[str, Any],
        company_id: int,
        user_id: int
    ) -> Optional[InterviewKit]:
        """Update an interview kit."""
        kit = self.get_interview_kit(kit_id, company_id)
        if not kit:
            return None

        update_fields = [
            'name', 'description', 'job_position_id', 'department_id',
            'interview_type', 'duration_minutes', 'is_template', 'is_active'
        ]

        for field in update_fields:
            if field in data and data[field] is not None:
                setattr(kit, field, data[field])

        # Update competencies if provided
        if 'competency_ids' in data:
            competencies = self.db.query(Competency).filter(
                Competency.id.in_(data['competency_ids']),
                Competency.company_id == company_id,
            ).all()
            kit.competencies = competencies

        kit.updated_by = user_id
        self.db.commit()
        self.db.refresh(kit)
        return kit

    # =========================================================================
    # Interview Statistics
    # =========================================================================

    def get_interview_stats(
        self,
        company_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get interview statistics."""
        query = self.db.query(InterviewSchedule).filter(
            InterviewSchedule.company_id == company_id,
            InterviewSchedule.is_deleted == False,
        )

        if start_date:
            query = query.filter(InterviewSchedule.interview_date >= start_date)
        if end_date:
            query = query.filter(InterviewSchedule.interview_date <= end_date)

        total = query.count()
        completed = query.filter(InterviewSchedule.status == 'completed').count()
        cancelled = query.filter(InterviewSchedule.status == 'cancelled').count()
        scheduled = query.filter(InterviewSchedule.status == 'scheduled').count()

        # Average rating
        avg_rating = self.db.query(func.avg(InterviewSchedule.overall_rating)).filter(
            InterviewSchedule.company_id == company_id,
            InterviewSchedule.overall_rating.isnot(None),
            InterviewSchedule.is_deleted == False,
        )
        if start_date:
            avg_rating = avg_rating.filter(InterviewSchedule.interview_date >= start_date)
        if end_date:
            avg_rating = avg_rating.filter(InterviewSchedule.interview_date <= end_date)
        avg_rating = avg_rating.scalar()

        # By type
        by_type = {}
        type_counts = self.db.query(
            InterviewSchedule.interview_type,
            func.count(InterviewSchedule.id)
        ).filter(
            InterviewSchedule.company_id == company_id,
            InterviewSchedule.is_deleted == False,
        ).group_by(InterviewSchedule.interview_type)

        if start_date:
            type_counts = type_counts.filter(InterviewSchedule.interview_date >= start_date)
        if end_date:
            type_counts = type_counts.filter(InterviewSchedule.interview_date <= end_date)

        for interview_type, count in type_counts.all():
            by_type[interview_type] = count

        return {
            'total': total,
            'completed': completed,
            'cancelled': cancelled,
            'scheduled': scheduled,
            'completion_rate': (completed / total * 100) if total > 0 else 0,
            'average_rating': float(avg_rating) if avg_rating else None,
            'by_type': by_type,
        }
