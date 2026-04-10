package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mlbautomation/ProyectoEMLB/model"
)

type Order struct {
	db *pgxpool.Pool
}

func NewOrder(db *pgxpool.Pool) *Order {
	return &Order{db: db}
}

func (r *Order) Create(order *model.Order) error {
	tx, err := r.db.BeginTx(context.Background(), pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	_, err = tx.Exec(context.Background(), `
		INSERT INTO orders (
			id, user_id, status, payment_provider, payment_status, currency,
			subtotal, total, paypal_order_id, paypal_capture_id, paid_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`, order.ID, order.UserID, order.Status, order.PaymentProvider, order.PaymentStatus, order.Currency, order.Subtotal, order.Total, nullString(order.PayPalOrderID), nullString(order.PayPalCaptureID), order.PaidAt, order.CreatedAt, order.CreatedAt)
	if err != nil {
		return err
	}

	for _, item := range order.Items {
		_, err = tx.Exec(context.Background(), `
			INSERT INTO order_items (
				id, order_id, product_id, variant_id, product_name, variant_sku,
				color, size, unit_price, quantity, line_total, created_at
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		`, item.ID, order.ID, item.ProductID, item.VariantID, item.ProductName, item.VariantSKU, item.Color, item.Size, item.UnitPrice, item.Quantity, item.LineTotal, order.CreatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit(context.Background())
}

func (r *Order) ListByUserID(userID uuid.UUID) ([]model.Order, error) {
	return r.queryOrders(`WHERE o.user_id = $1 ORDER BY o.created_at DESC`, userID)
}

func (r *Order) ListAll() ([]model.Order, error) {
	return r.queryOrders(`ORDER BY o.created_at DESC`)
}

func (r *Order) GetByID(orderID uuid.UUID) (model.Order, error) {
	orders, err := r.queryOrders(`WHERE o.id = $1`, orderID)
	if err != nil {
		return model.Order{}, err
	}
	if len(orders) == 0 {
		return model.Order{}, pgx.ErrNoRows
	}
	return orders[0], nil
}

func (r *Order) UpdateStatus(orderID uuid.UUID, status string) (model.Order, error) {
	_, err := r.db.Exec(context.Background(), `
		UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1
	`, orderID, status)
	if err != nil {
		return model.Order{}, err
	}
	return r.GetByID(orderID)
}

func (r *Order) GetByIDForUser(orderID, userID uuid.UUID) (model.Order, error) {
	orders, err := r.queryOrders(`WHERE o.id = $1 AND o.user_id = $2`, orderID, userID)
	if err != nil {
		return model.Order{}, err
	}
	if len(orders) == 0 {
		return model.Order{}, pgx.ErrNoRows
	}
	return orders[0], nil
}

func (r *Order) AttachPayPalOrderID(orderID uuid.UUID, payPalOrderID string) error {
	_, err := r.db.Exec(context.Background(), `UPDATE orders SET paypal_order_id = $2, updated_at = NOW() WHERE id = $1`, orderID, payPalOrderID)
	return err
}

func (r *Order) MarkPayPalCaptured(orderID uuid.UUID, payPalOrderID, payPalCaptureID string) (model.Order, error) {
	tx, err := r.db.BeginTx(context.Background(), pgx.TxOptions{})
	if err != nil {
		return model.Order{}, err
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	items, err := r.getOrderItemsTx(tx, orderID)
	if err != nil {
		return model.Order{}, err
	}

	for _, item := range items {
		commandTag, execErr := tx.Exec(context.Background(), `
			UPDATE product_variants
			SET stock = stock - $2, updated_at = NOW()
			WHERE id = $1 AND stock >= $2
		`, item.VariantID, item.Quantity)
		if execErr != nil {
			return model.Order{}, execErr
		}
		if commandTag.RowsAffected() == 0 {
			return model.Order{}, fmt.Errorf("insufficient stock for variant %s", item.VariantID.String())
		}
	}

	var paidAt time.Time
	err = tx.QueryRow(context.Background(), `
		UPDATE orders
		SET status = $2,
			payment_status = $3,
			paypal_order_id = $4,
			paypal_capture_id = $5,
			paid_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		RETURNING paid_at
	`, orderID, model.OrderStatusPaid, model.PaymentStatusCaptured, payPalOrderID, payPalCaptureID).Scan(&paidAt)
	if err != nil {
		return model.Order{}, err
	}

	if err = tx.Commit(context.Background()); err != nil {
		return model.Order{}, err
	}

	updatedOrder, err := r.GetByID(orderID)
	if err != nil {
		return model.Order{}, err
	}
	updatedOrder.PaidAt = &paidAt
	return updatedOrder, nil
}

func (r *Order) getOrderItemsTx(tx pgx.Tx, orderID uuid.UUID) ([]model.OrderItem, error) {
	rows, err := tx.Query(context.Background(), `
		SELECT id, product_id, product_name, variant_id, variant_sku, color, size, unit_price, quantity, line_total
		FROM order_items
		WHERE order_id = $1
		ORDER BY created_at ASC
	`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.OrderItem{}
	for rows.Next() {
		item := model.OrderItem{}
		if err = rows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.VariantID, &item.VariantSKU, &item.Color, &item.Size, &item.UnitPrice, &item.Quantity, &item.LineTotal); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *Order) queryOrders(whereClause string, args ...interface{}) ([]model.Order, error) {
	query := `
		SELECT
			o.id, o.user_id, o.status, o.payment_provider, o.payment_status, o.currency,
			o.subtotal, o.total, COALESCE(o.paypal_order_id, ''), COALESCE(o.paypal_capture_id, ''),
			o.paid_at, o.created_at
		FROM orders o
	` + whereClause

	rows, err := r.db.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]model.Order, 0)
	for rows.Next() {
		var (
			orderID         uuid.UUID
			userID          uuid.UUID
			status          string
			paymentProvider string
			paymentStatus   string
			currency        string
			subtotal        float64
			total           float64
			payPalOrderID   string
			payPalCaptureID string
			paidAt          sql.NullTime
			createdAt       time.Time
		)

		if err = rows.Scan(&orderID, &userID, &status, &paymentProvider, &paymentStatus, &currency, &subtotal, &total, &payPalOrderID, &payPalCaptureID, &paidAt, &createdAt); err != nil {
			return nil, err
		}

		orderData := model.Order{
			ID:              orderID,
			UserID:          userID,
			Status:          status,
			PaymentProvider: paymentProvider,
			PaymentStatus:   paymentStatus,
			Currency:        currency,
			Subtotal:        subtotal,
			Total:           total,
			PayPalOrderID:   payPalOrderID,
			PayPalCaptureID: payPalCaptureID,
			CreatedAt:       createdAt.UTC(),
			Items:           []model.OrderItem{},
		}
		if paidAt.Valid {
			paidAtValue := paidAt.Time.UTC()
			orderData.PaidAt = &paidAtValue
		}

		orderData.Items, err = r.getOrderItems(orderID)
		if err != nil {
			return nil, err
		}

		orders = append(orders, orderData)
	}

	return orders, nil
}

func (r *Order) getOrderItems(orderID uuid.UUID) ([]model.OrderItem, error) {
	rows, err := r.db.Query(context.Background(), `
		SELECT id, product_id, product_name, variant_id, variant_sku, color, size, unit_price, quantity, line_total
		FROM order_items
		WHERE order_id = $1
		ORDER BY created_at ASC
	`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []model.OrderItem{}
	for rows.Next() {
		item := model.OrderItem{}
		if err = rows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.VariantID, &item.VariantSKU, &item.Color, &item.Size, &item.UnitPrice, &item.Quantity, &item.LineTotal); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func nullString(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}
