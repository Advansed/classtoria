-- Таблица детей, привязанных к родителю и классу.
-- Ключ: (class_id, parent_id, phone) — один ребёнок с данным телефоном у родителя в классе.

CREATE TABLE IF NOT EXISTS Childrens (
  class_id   VARCHAR(64)   NOT NULL,
  parent_id  VARCHAR(64)   NOT NULL,
  phone      VARCHAR(20)   NOT NULL,
  name       VARCHAR(255)  NOT NULL DEFAULT '',
  image      VARCHAR(512)  NOT NULL DEFAULT '',
  PRIMARY KEY (class_id, parent_id, phone),
  KEY idx_childrens_parent (parent_id),
  KEY idx_childrens_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
