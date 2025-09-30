#!/usr/bin/env python3
"""
Add a progress tracking endpoint for file uploads
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def add_progress_endpoint():
    """Add progress tracking endpoint to the API"""
    
    progress_endpoint_code = '''

@router.get("/import/{job_id}/progress", response_model=Dict[str, Any])
async def get_import_progress(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get real-time progress of import job"""
    
    logger.info(f"📊 Getting progress for job {job_id}")
    
    try:
        # Get import job
        import_job = db.query(ImportJob).filter(ImportJob.job_id == job_id).first()
        if not import_job:
            logger.warning(f"❌ Job {job_id} not found")
            raise HTTPException(status_code=404, detail="Import job not found")
        
        # Check ownership
        if import_job.created_by != current_user.id and not current_user.is_superuser:
            logger.warning(f"❌ Access denied to job {job_id} for user {current_user.id}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Calculate progress based on status
        progress_map = {
            ImportStatus.PENDING: {"percent": 0, "message": "Waiting to start"},
            ImportStatus.UPLOADING: {"percent": 25, "message": "Uploading file"},
            ImportStatus.PARSING: {"percent": 40, "message": "Parsing file content"},
            ImportStatus.PARSED: {"percent": 50, "message": "File parsed successfully"},
            ImportStatus.VALIDATING: {"percent": 60, "message": "Validating data"},
            ImportStatus.VALIDATED: {"percent": 70, "message": "Data validated"},
            ImportStatus.IMPORTING: {"percent": 85, "message": "Importing to database"},
            ImportStatus.COMPLETED: {"percent": 100, "message": "Import completed successfully"},
            ImportStatus.FAILED: {"percent": 0, "message": "Import failed"},
            ImportStatus.CANCELLED: {"percent": 0, "message": "Import cancelled"}
        }
        
        current_progress = progress_map.get(import_job.status, {"percent": 0, "message": "Unknown status"})
        
        # Get detailed info based on current status
        details = {
            "job_id": job_id,
            "status": import_job.status,
            "progress": current_progress,
            "file_info": {
                "filename": import_job.original_filename,
                "size": import_job.file_size,
                "format": import_job.file_format
            },
            "table_name": import_job.table_name,
            "total_rows": import_job.total_rows,
            "processed_rows": import_job.processed_rows or 0,
            "valid_rows": import_job.valid_rows or 0,
            "error_rows": import_job.error_rows or 0,
            "created_at": import_job.created_at.isoformat(),
            "updated_at": import_job.updated_at.isoformat() if import_job.updated_at else None,
            "logs": []
        }
        
        # Add error details if failed
        if import_job.status == ImportStatus.FAILED and import_job.error_message:
            details["error"] = {
                "message": import_job.error_message,
                "details": import_job.error_details or {}
            }
        
        # Add validation results if available
        if import_job.import_results and "validation_results" in import_job.import_results:
            validation = import_job.import_results["validation_results"]
            details["validation"] = {
                "is_valid": validation.get("is_valid", False),
                "errors": validation.get("errors", []),
                "warnings": validation.get("warnings", [])
            }
        
        # Get recent logs from audit trail (if available)
        try:
            from app.models.data_import_export import ImportAuditLog
            recent_logs = db.query(ImportAuditLog).filter(
                ImportAuditLog.import_job_id == import_job.id
            ).order_by(ImportAuditLog.timestamp.desc()).limit(10).all()
            
            details["logs"] = [
                {
                    "timestamp": log.timestamp.isoformat(),
                    "action": log.action,
                    "message": log.details.get("message", "") if log.details else "",
                    "level": log.details.get("level", "info") if log.details else "info"
                }
                for log in recent_logs
            ]
        except Exception as e:
            logger.warning(f"Could not fetch audit logs: {e}")
        
        logger.info(f"✅ Progress retrieved for job {job_id}: {current_progress['percent']}%")
        return details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get progress for job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get import progress"
        )

'''
    
    # Read the current file
    with open('/home/sen/FastNext/backend/app/api/v1/data_import_export.py', 'r') as f:
        content = f.read()
    
    # Find a good place to insert the endpoint (after other import endpoints)
    insert_point = content.find('@router.post("/import/validate"')
    if insert_point == -1:
        insert_point = content.find('# Export endpoints')
        if insert_point == -1:
            print("❌ Could not find insertion point")
            return False
    
    # Insert the progress endpoint
    new_content = content[:insert_point] + progress_endpoint_code + "\n\n" + content[insert_point:]
    
    # Write back to file
    with open('/home/sen/FastNext/backend/app/api/v1/data_import_export.py', 'w') as f:
        f.write(new_content)
    
    print("✅ Progress tracking endpoint added successfully!")
    return True

if __name__ == "__main__":
    print("Adding Progress Tracking Endpoint...")
    print("=" * 50)
    
    success = add_progress_endpoint()
    
    if success:
        print("\n✅ PROGRESS ENDPOINT ADDED!")
        print("\n🎯 New endpoint available:")
        print("  GET /api/v1/import/{job_id}/progress")
        print("\n📊 Progress information includes:")
        print("  - Current status and percentage")
        print("  - File information and statistics")
        print("  - Row counts (total, processed, valid, errors)")
        print("  - Validation results and error details")
        print("  - Recent activity logs")
        print("  - Timestamps for tracking")
        
        print("\n🚀 Usage:")
        print("  1. Start file upload and get job_id")
        print("  2. Poll progress endpoint with job_id")
        print("  3. Show real-time progress to user")
        print("  4. Handle completion or errors")
    else:
        print("❌ Failed to add progress endpoint!")
        sys.exit(1)