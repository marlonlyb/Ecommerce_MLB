package order

import (
	"github.com/google/uuid"

	"github.com/mlbautomation/ProyectoEMLB/model"
)

type Repository interface {
	Create(order *model.Order) error
	ListByUserID(userID uuid.UUID) ([]model.Order, error)
	ListAll() ([]model.Order, error)
	GetByID(orderID uuid.UUID) (model.Order, error)
	GetByIDForUser(orderID, userID uuid.UUID) (model.Order, error)
	UpdateStatus(orderID uuid.UUID, status string) (model.Order, error)
	AttachPayPalOrderID(orderID uuid.UUID, payPalOrderID string) error
	MarkPayPalCaptured(orderID uuid.UUID, payPalOrderID, payPalCaptureID string) (model.Order, error)
}

type PayPalGateway interface {
	CreateOrder(order model.Order) (string, error)
	CaptureOrder(payPalOrderID string) (CaptureResult, error)
}

type CaptureResult struct {
	OrderID    string
	CaptureID  string
	Status     string
	Currency   string
	Total      float64
	RawPayload map[string]interface{}
}

type Service interface {
	CheckoutPayPal(userID uuid.UUID, request model.CheckoutPayPalRequest) (model.Order, string, error)
	CapturePayPal(userID, orderID uuid.UUID, request model.CapturePayPalOrderRequest) (model.Order, error)
	ListByUserID(userID uuid.UUID) ([]model.Order, error)
	GetByIDForUser(orderID, userID uuid.UUID) (model.Order, error)
	ListAll() ([]model.Order, error)
	GetByID(orderID uuid.UUID) (model.Order, error)
	UpdateStatus(orderID uuid.UUID, status string) (model.Order, error)
}
