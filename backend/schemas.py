from enum import IntEnum
from typing import Optional
from pydantic import BaseModel, Field

class Priority(IntEnum):
    LOW = 3
    MEDIUM = 2
    HIGH = 1

class TodoBase(BaseModel):
    todo_name: str = Field(..., min_length=3, max_length=512, description='Name of todo')
    todo_desc: str = Field(..., description='Description of todo')
    priority: Priority = Field(default=Priority.LOW, description='Priority of the todo')
    is_completed: bool = Field(default=False, description='Task completion status')
    deadline: Optional[str] = Field(None, description='Deadline in YYYY-MM-DD format')
    category: Optional[str] = Field("General", description='Task Category')

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    todo_name: Optional[str] = Field(None, min_length=3, max_length=512, description='Name of todo')
    todo_desc: Optional[str] = Field(None, description='Description of todo')
    priority: Optional[Priority] = Field(None, description='Priority of the todo')
    is_completed: Optional[bool] = Field(None, description='Task completion status')
    deadline: Optional[str] = Field(None, description='Deadline in YYYY-MM-DD format')
    category: Optional[str] = Field(None, description='Task Category')
    time_estimate:Optional[int] = Field(0,description='Estimated time of completion')
    

class Todo(TodoBase):
    todo_id: int = Field(..., description='Unique identifier of the todo')

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
