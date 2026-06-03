package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func getSecretKey() []byte {
	key := os.Getenv("SECRET_KEY")
	if key == "" {
		return []byte("super-secret-local-key")
	}
	return []byte(key)
}

var secretKey = getSecretKey()

//HashPassword generates a bcrypt hash
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

//CheckPasswordHash compares a raw password to a hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

//GenerateJWT creates a new token for a user
func GenerateJWT(username string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": username,
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(),
	})

	return token.SignedString(secretKey)
}

//ValidateJWT verifies and parses the token
func ValidateJWT(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		username, ok := claims["sub"].(string)
		if !ok {
			return "", errors.New("invalid sub claim")
		}
		return username, nil
	}

	return "", errors.New("invalid token")
}
