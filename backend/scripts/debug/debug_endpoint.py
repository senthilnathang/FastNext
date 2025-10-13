#!/usr/bin/env python3
"""
Add a simple debug endpoint to test basic functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

def add_debug_endpoint():
    """Add a simple debug endpoint to main.py"""
    
    main_file = "/home/sen/FastNext/backend/main.py"
    
    debug_endpoint_code = '''
    # Debug endpoint
    @app.get("/debug")
    async def debug_endpoint():
        """Simple debug endpoint to test basic functionality"""
        return {"status": "ok", "message": "Debug endpoint working"}
    
    @app.get("/debug/headers")
    async def debug_headers(request: Request):
        """Debug endpoint to check headers"""
        try:
            return {
                "headers": dict(request.headers),
                "method": request.method,
                "url": str(request.url),
                "status": "ok"
            }
        except Exception as e:
            return {"error": str(e), "status": "error"}
'''
    
    try:
        with open(main_file, 'r') as f:
            content = f.read()
        
        # Find where to insert the debug endpoint (before the return statement)
        insert_point = content.find("return app")
        if insert_point != -1:
            new_content = content[:insert_point] + debug_endpoint_code + "\n    " + content[insert_point:]
            
            with open(main_file, 'w') as f:
                f.write(new_content)
            
            print("✅ Debug endpoints added to main.py")
            print("   /debug - Basic functionality test")
            print("   /debug/headers - Headers test")
            return True
        else:
            print("❌ Could not find insertion point in main.py")
            return False
            
    except Exception as e:
        print(f"❌ Error adding debug endpoints: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Adding Debug Endpoints")
    print("=" * 40)
    
    success = add_debug_endpoint()
    
    if success:
        print("\n✅ Debug endpoints added successfully")
        print("Restart the server and test:")
        print("  GET http://localhost:8000/debug")
        print("  GET http://localhost:8000/debug/headers")
    else:
        print("\n❌ Failed to add debug endpoints")
        sys.exit(1)