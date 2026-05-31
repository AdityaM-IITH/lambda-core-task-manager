from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    todos = relationship("Todo", back_populates="owner")

class Todo(Base):
    __tablename__ = 'todos'

    todo_id = Column(Integer, primary_key=True, index=True)
    todo_name = Column(String, index=True)
    todo_desc = Column(String)
    priority = Column(Integer, default=3)
    is_completed = Column(Boolean, default=False)
    deadline = Column(String)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="todos")
    category = Column(String, default="General")
