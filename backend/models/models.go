package models

import "time"

type User struct {
	ID             uint   `gorm:"primaryKey" json:"id"`
	Username       string `gorm:"uniqueIndex;not null" json:"username"`
	HashedPassword string `gorm:"not null" json:"-"`
}

type Todo struct {
	TodoID      uint      `gorm:"primaryKey" json:"todo_id"`
	TodoName    string    `gorm:"not null" json:"todo_name"`
	TodoDesc    string    `json:"todo_desc"`
	Priority    int       `json:"priority"`
	IsCompleted bool      `gorm:"default:false" json:"is_completed"`
	Deadline    string    `json:"deadline"`
	OwnerID     uint      `json:"owner_id"`
	Category    string    `json:"category"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}
