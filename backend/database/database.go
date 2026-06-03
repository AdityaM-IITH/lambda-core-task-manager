package database

import (
	"log"
	"os"

	"backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	godotenv.Load()

	var database *gorm.DB
	var err error

	dsn := os.Getenv("DATABASE_URL")
	if dsn != "" {
		//Use PostgreSQL in production
		database, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	} else {
		//Fallback to SQLite for local testing, exactly like the Python backend
		database, err = gorm.Open(sqlite.Open("todos.db"), &gorm.Config{})
	}

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = database.AutoMigrate(&models.User{}, &models.Todo{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = database
}
