package product

import (
	"github.com/google/uuid"

	"github.com/mlbautomation/ProyectoEMLB/model"
)

type Repository interface {
	Create(m *model.Product) error
	Update(m *model.Product) error
	Delete(ID uuid.UUID) error

	GetByID(ID uuid.UUID) (model.Product, error)
	GetAll() (model.Products, error)
	GetStoreByID(ID uuid.UUID) (model.StoreProduct, error)
	GetStoreAll() ([]model.StoreProduct, error)
	GetStoreAllAdmin() ([]model.StoreProduct, error)
}

type RepositoryPurchaseOrder interface {
	GetByID(ID uuid.UUID) (model.Product, error)
}

type Service interface {
	Create(m *model.Product) error
	Update(m *model.Product) error
	Delete(ID uuid.UUID) error

	GetByID(ID uuid.UUID) (model.Product, error)
	GetAll() (model.Products, error)
	GetStoreByID(ID uuid.UUID) (model.StoreProduct, error)
	GetStoreAll() ([]model.StoreProduct, error)
	GetStoreAllAdmin() ([]model.StoreProduct, error)
}
