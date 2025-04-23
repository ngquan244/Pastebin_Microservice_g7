CREATE DATABASE IF NOT EXISTS pastebin;
USE pastebin;

DROP TABLE IF EXISTS paste;

CREATE TABLE paste (
  id varchar(10) NOT NULL,
  content text NOT NULL,
  title varchar(255) DEFAULT 'Untitled',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  expires_at datetime DEFAULT NULL,
  views int DEFAULT 0,
  privacy enum('PUBLIC','PRIVATE') DEFAULT 'PUBLIC',
  PRIMARY KEY (id)
)