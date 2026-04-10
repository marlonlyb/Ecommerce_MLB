package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/mlbautomation/ProyectoEMLB/domain/ports/order"
	"github.com/mlbautomation/ProyectoEMLB/domain/ports/product"
	"github.com/mlbautomation/ProyectoEMLB/model"
)

var (
	ErrValidation          = errors.New("validation error")
	ErrStockInsufficient   = errors.New("stock insufficient")
	ErrOrderNotFound       = errors.New("order not found")
	ErrOrderStateInvalid   = errors.New("order state invalid")
	ErrPayPalCaptureFailed = errors.New("paypal capture failed")
)

type Order struct {
	Repository        order.Repository
	ProductRepository product.Repository
	PayPalGateway     order.PayPalGateway
}

func NewOrder(repository order.Repository, productRepository product.Repository, payPalGateway order.PayPalGateway) *Order {
	return &Order{Repository: repository, ProductRepository: productRepository, PayPalGateway: payPalGateway}
}

func (s *Order) CheckoutPayPal(userID uuid.UUID, request model.CheckoutPayPalRequest) (model.Order, string, error) {
	if len(request.Items) == 0 {
		return model.Order{}, "", fmt.Errorf("%w: items required", ErrValidation)
	}

	storeProducts, err := s.ProductRepository.GetStoreAll()
	if err != nil {
		return model.Order{}, "", fmt.Errorf("load variants: %w", err)
	}

	variantIndex := map[uuid.UUID]model.StoreProductVariant{}
	productIndex := map[uuid.UUID]model.StoreProduct{}
	for _, productData := range storeProducts {
		productIndex[productData.ID] = productData
		for _, variant := range productData.Variants {
			variantIndex[variant.ID] = variant
		}
	}

	now := time.Now().UTC()
	orderID, err := uuid.NewUUID()
	if err != nil {
		return model.Order{}, "", err
	}

	items := make([]model.OrderItem, 0, len(request.Items))
	subtotal := 0.0
	for _, item := range request.Items {
		if item.VariantID == uuid.Nil || item.Quantity < 1 {
			return model.Order{}, "", fmt.Errorf("%w: invalid item", ErrValidation)
		}

		variant, ok := variantIndex[item.VariantID]
		if !ok {
			return model.Order{}, "", fmt.Errorf("%w: variant not found", ErrValidation)
		}

		if variant.Stock < item.Quantity {
			return model.Order{}, "", fmt.Errorf("%w: variant_id=%s available_stock=%d", ErrStockInsufficient, item.VariantID.String(), variant.Stock)
		}

		productData, ok := productIndex[variant.ProductID]
		if !ok || !productData.Active {
			return model.Order{}, "", fmt.Errorf("%w: product inactive", ErrValidation)
		}

		itemID, err := uuid.NewUUID()
		if err != nil {
			return model.Order{}, "", err
		}

		lineTotal := roundMoney(float64(item.Quantity) * variant.Price)
		subtotal = roundMoney(subtotal + lineTotal)
		items = append(items, model.OrderItem{
			ID:          itemID,
			ProductID:   productData.ID,
			ProductName: productData.Name,
			VariantID:   variant.ID,
			VariantSKU:  variant.SKU,
			Color:       variant.Color,
			Size:        variant.Size,
			UnitPrice:   variant.Price,
			Quantity:    item.Quantity,
			LineTotal:   lineTotal,
		})
	}

	createdOrder := model.Order{
		ID:              orderID,
		UserID:          userID,
		Status:          model.OrderStatusPendingPayment,
		PaymentProvider: model.PaymentProviderPayPal,
		PaymentStatus:   model.PaymentStatusPending,
		Currency:        "USD",
		Subtotal:        subtotal,
		Total:           subtotal,
		CreatedAt:       now,
		Items:           items,
	}

	payPalOrderID, err := s.PayPalGateway.CreateOrder(createdOrder)
	if err != nil {
		return model.Order{}, "", err
	}
	createdOrder.PayPalOrderID = payPalOrderID

	if err = s.Repository.Create(&createdOrder); err != nil {
		return model.Order{}, "", err
	}

	return createdOrder, payPalOrderID, nil
}

func (s *Order) CapturePayPal(userID, orderID uuid.UUID, request model.CapturePayPalOrderRequest) (model.Order, error) {
	storedOrder, err := s.Repository.GetByIDForUser(orderID, userID)
	if err != nil {
		return model.Order{}, fmt.Errorf("%w: %v", ErrOrderNotFound, err)
	}

	if storedOrder.Status != model.OrderStatusPendingPayment || storedOrder.PaymentStatus != model.PaymentStatusPending {
		return model.Order{}, ErrOrderStateInvalid
	}

	if strings.TrimSpace(request.PayPalOrderID) == "" || request.PayPalOrderID != storedOrder.PayPalOrderID {
		return model.Order{}, fmt.Errorf("%w: paypal order mismatch", ErrValidation)
	}

	result, err := s.PayPalGateway.CaptureOrder(request.PayPalOrderID)
	if err != nil {
		return model.Order{}, fmt.Errorf("%w: %v", ErrPayPalCaptureFailed, err)
	}

	if !strings.EqualFold(result.OrderID, request.PayPalOrderID) {
		return model.Order{}, fmt.Errorf("%w: paypal order mismatch", ErrPayPalCaptureFailed)
	}

	if !strings.EqualFold(result.Currency, storedOrder.Currency) || roundMoney(result.Total) != roundMoney(storedOrder.Total) {
		return model.Order{}, fmt.Errorf("%w: amount or currency mismatch", ErrPayPalCaptureFailed)
	}

	if result.CaptureID == "" || !strings.EqualFold(result.Status, "COMPLETED") {
		return model.Order{}, fmt.Errorf("%w: capture not completed", ErrPayPalCaptureFailed)
	}

	updatedOrder, err := s.Repository.MarkPayPalCaptured(orderID, request.PayPalOrderID, result.CaptureID)
	if err != nil {
		return model.Order{}, err
	}

	return updatedOrder, nil
}

func (s *Order) ListByUserID(userID uuid.UUID) ([]model.Order, error) {
	return s.Repository.ListByUserID(userID)
}

func (s *Order) GetByIDForUser(orderID, userID uuid.UUID) (model.Order, error) {
	orderData, err := s.Repository.GetByIDForUser(orderID, userID)
	if err != nil {
		return model.Order{}, fmt.Errorf("%w: %v", ErrOrderNotFound, err)
	}

	return orderData, nil
}

func (s *Order) ListAll() ([]model.Order, error) {
	return s.Repository.ListAll()
}

func (s *Order) GetByID(orderID uuid.UUID) (model.Order, error) {
	orderData, err := s.Repository.GetByID(orderID)
	if err != nil {
		return model.Order{}, fmt.Errorf("%w: %v", ErrOrderNotFound, err)
	}

	return orderData, nil
}

func (s *Order) UpdateStatus(orderID uuid.UUID, status string) (model.Order, error) {
	validStatuses := map[string]bool{
		model.OrderStatusPendingPayment: true,
		model.OrderStatusPaid:           true,
		model.OrderStatusPaymentFailed:  true,
		model.OrderStatusCancelled:      true,
		model.OrderStatusRefunded:       true,
	}
	if !validStatuses[status] {
		return model.Order{}, fmt.Errorf("%w: invalid status %q", ErrValidation, status)
	}

	_, err := s.Repository.GetByID(orderID)
	if err != nil {
		return model.Order{}, fmt.Errorf("%w: %v", ErrOrderNotFound, err)
	}

	return s.Repository.UpdateStatus(orderID, status)
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}
