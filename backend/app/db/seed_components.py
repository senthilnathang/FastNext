from sqlalchemy.orm import Session
from app.models.component import Component, ComponentType


def create_default_components(db: Session) -> None:
    """Create default global components for the app builder"""
    
    default_components = [
        {
            "name": "Text Block",
            "type": ComponentType.TEXT,
            "category": "basic",
            "description": "A simple text block with customizable content",
            "schema": {
                "properties": {
                    "content": {"type": "string", "title": "Content"},
                    "fontSize": {"type": "string", "title": "Font Size", "enum": ["sm", "md", "lg", "xl"]},
                    "color": {"type": "string", "title": "Text Color"},
                    "alignment": {"type": "string", "title": "Alignment", "enum": ["left", "center", "right"]}
                },
                "required": ["content"]
            },
            "default_props": {
                "content": "Enter your text here",
                "fontSize": "md",
                "color": "#000000",
                "alignment": "left"
            },
            "template": """
            <div style="text-align: {alignment}; color: {color}; font-size: {fontSize};">
                {content}
            </div>
            """,
            "is_global": True,
            "is_published": True
        },
        {
            "name": "Button",
            "type": ComponentType.BUTTON,
            "category": "basic",
            "description": "Customizable button component",
            "schema": {
                "properties": {
                    "text": {"type": "string", "title": "Button Text"},
                    "variant": {"type": "string", "title": "Variant", "enum": ["primary", "secondary", "outline"]},
                    "size": {"type": "string", "title": "Size", "enum": ["sm", "md", "lg"]},
                    "onClick": {"type": "string", "title": "Click Action"}
                },
                "required": ["text"]
            },
            "default_props": {
                "text": "Click me",
                "variant": "primary",
                "size": "md",
                "onClick": ""
            },
            "template": """
            <button 
                class="btn btn-{variant} btn-{size}"
                onclick="{onClick}"
            >
                {text}
            </button>
            """,
            "is_global": True,
            "is_published": True
        },
        {
            "name": "Image",
            "type": ComponentType.IMAGE,
            "category": "media",
            "description": "Image component with customizable source and alt text",
            "schema": {
                "properties": {
                    "src": {"type": "string", "title": "Image URL"},
                    "alt": {"type": "string", "title": "Alt Text"},
                    "width": {"type": "string", "title": "Width"},
                    "height": {"type": "string", "title": "Height"}
                },
                "required": ["src", "alt"]
            },
            "default_props": {
                "src": "https://via.placeholder.com/300x200",
                "alt": "Placeholder image",
                "width": "300px",
                "height": "200px"
            },
            "template": """
            <img 
                src="{src}" 
                alt="{alt}"
                style="width: {width}; height: {height};"
            />
            """,
            "is_global": True,
            "is_published": True
        },
        {
            "name": "Container",
            "type": ComponentType.LAYOUT,
            "category": "layout",
            "description": "Container for grouping other components",
            "schema": {
                "properties": {
                    "padding": {"type": "string", "title": "Padding"},
                    "margin": {"type": "string", "title": "Margin"},
                    "backgroundColor": {"type": "string", "title": "Background Color"},
                    "flexDirection": {"type": "string", "title": "Flex Direction", "enum": ["row", "column"]}
                }
            },
            "default_props": {
                "padding": "16px",
                "margin": "0px",
                "backgroundColor": "transparent",
                "flexDirection": "column"
            },
            "template": """
            <div style="
                padding: {padding}; 
                margin: {margin}; 
                background-color: {backgroundColor};
                display: flex;
                flex-direction: {flexDirection};
            ">
                {children}
            </div>
            """,
            "is_global": True,
            "is_published": True
        },
        {
            "name": "Form Input",
            "type": ComponentType.FORM,
            "category": "form",
            "description": "Input field for forms",
            "schema": {
                "properties": {
                    "label": {"type": "string", "title": "Label"},
                    "placeholder": {"type": "string", "title": "Placeholder"},
                    "type": {"type": "string", "title": "Input Type", "enum": ["text", "email", "password", "number"]},
                    "required": {"type": "boolean", "title": "Required"}
                },
                "required": ["label"]
            },
            "default_props": {
                "label": "Input Label",
                "placeholder": "Enter value...",
                "type": "text",
                "required": False
            },
            "template": """
            <div class="form-field">
                <label>{label}</label>
                <input 
                    type="{type}" 
                    placeholder="{placeholder}"
                    required="{required}"
                />
            </div>
            """,
            "is_global": True,
            "is_published": True
        }
    ]
    
    for component_data in default_components:
        existing_component = db.query(Component).filter(
            Component.name == component_data["name"],
            Component.is_global == True
        ).first()
        
        if not existing_component:
            component = Component(**component_data)
            db.add(component)
    
    db.commit()


def seed_components_if_empty(db: Session) -> None:
    """Seed components if no global components exist"""
    global_components_count = db.query(Component).filter(Component.is_global == True).count()
    
    if global_components_count == 0:
        create_default_components(db)