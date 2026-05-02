-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: organic_beauty_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `total_sales` decimal(10,2) DEFAULT '0.00',
  `items_sold` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Face Care','Organic skincare products for face',1350.94,13,'2025-11-19 14:35:38'),(2,'Hair Care','Natural hair care solutions',231.95,6,'2025-11-19 14:35:38'),(3,'Body Care','Body care and bath products',1210.98,10,'2025-11-19 14:35:38'),(4,'Special Care','Specialty organic products',0.00,0,'2025-11-19 14:35:38');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tracking_id` varchar(100) DEFAULT NULL,
  `tracking_url` varchar(500) DEFAULT NULL,
  `item_status` enum('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,17,13,NULL,NULL,1,149.00,'2026-01-22 13:22:02','TRK1221733886',NULL,'pending'),(2,18,12,NULL,NULL,1,149.00,'2026-01-22 13:23:33','TRK2137637014',NULL,'pending'),(3,19,13,NULL,NULL,1,149.00,'2026-02-03 07:43:46','TRK6263462138',NULL,'pending'),(4,20,13,NULL,NULL,1,149.00,'2026-02-03 07:47:16','TRK8361053530',NULL,'pending'),(11,29,11,'Hair Remove Powder (50g)',NULL,3,149.00,'2026-02-07 07:15:14',NULL,NULL,'pending'),(12,30,12,'Aloevera Face Gel',NULL,1,149.00,'2026-02-07 07:34:23',NULL,NULL,'pending'),(13,31,10,'Rose Mere Hair Water Serum',NULL,1,129.00,'2026-02-07 07:45:25',NULL,NULL,'pending'),(14,32,13,'Nalangu Maavu Soap',NULL,1,149.00,'2026-02-10 05:05:57',NULL,NULL,'pending'),(15,33,12,'Aloevera Face Gel',NULL,1,149.00,'2026-02-10 07:13:00',NULL,NULL,'pending'),(16,34,3,'Red Wine Soap',NULL,1,130.00,'2026-02-18 07:22:31',NULL,NULL,'pending'),(17,35,8,'Kumkummadi Serum',NULL,1,149.00,'2026-02-23 10:52:08',NULL,NULL,'pending'),(18,36,2,'Charcoal Face Wash',NULL,1,150.00,'2026-03-26 15:16:02',NULL,NULL,'pending');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_statistics`
--

DROP TABLE IF EXISTS `order_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `total_orders` int DEFAULT '0',
  `total_sales` decimal(10,2) DEFAULT '0.00',
  `total_items_sold` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_statistics`
--

LOCK TABLES `order_statistics` WRITE;
/*!40000 ALTER TABLE `order_statistics` DISABLE KEYS */;
INSERT INTO `order_statistics` VALUES (1,'2025-11-20',3,78.77,3,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(2,'2025-11-21',2,138.88,2,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(3,'2025-12-06',1,21.49,1,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(4,'2025-12-13',2,52.88,2,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(5,'2025-12-17',1,25.89,1,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(6,'2025-12-29',1,165.00,1,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(7,'2026-01-02',2,149.54,2,'2026-01-02 12:25:32','2026-01-12 08:21:40'),(9,'2026-01-14',5,29999.50,12,'2026-01-14 08:47:13','2026-01-14 08:47:13'),(10,'2026-01-13',3,15999.75,8,'2026-01-14 08:47:13','2026-01-14 08:47:13'),(11,'2026-01-12',4,21999.00,10,'2026-01-14 08:47:13','2026-01-14 08:47:13'),(12,'2026-01-17',1,227.00,1,'2026-01-17 08:44:51','2026-01-17 08:44:51'),(13,'2026-01-18',1,186.87,1,'2026-01-18 07:11:00','2026-01-18 07:11:00'),(14,'2026-01-19',1,79.49,1,'2026-01-19 11:50:01','2026-01-19 11:50:01'),(15,'2026-01-22',2,398.00,2,'2026-01-22 13:22:02','2026-01-22 13:23:33'),(17,'2026-02-03',2,398.00,2,'2026-02-03 07:43:46','2026-02-03 07:47:16'),(19,'2026-02-07',3,825.00,5,'2026-02-07 07:15:14','2026-02-07 07:45:25'),(22,'2026-02-10',2,398.00,2,'2026-02-10 05:05:57','2026-02-10 07:13:00'),(24,'2026-02-18',1,180.00,1,'2026-02-18 07:22:31','2026-02-18 07:22:31'),(25,'2026-02-23',1,199.00,1,'2026-02-23 10:52:08','2026-02-23 10:52:08'),(26,'2026-03-26',1,200.00,1,'2026-03-26 15:16:02','2026-03-26 15:16:02');
/*!40000 ALTER TABLE `order_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `items` json DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('pending','completed','failed','paid') DEFAULT 'pending',
  `payment_method` varchar(50) DEFAULT 'cod',
  `order_status` enum('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  `shipping_address` text NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text,
  `expected_delivery_date` date DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (17,5,NULL,199.00,'paid','cod','delivered','palli st,thondi, Ramanathapuram, Tamil nadu, 654321, India','hasan m','h@gmail.com','987654321','2026-01-22 13:22:02','2026-01-22 13:25:21',NULL,'2026-01-28','TRK1221733886','2026-01-23 13:22:02','2026-01-24 13:22:02'),(18,5,NULL,199.00,'paid','cod','delivered','palli st,Thondi, ramanathapuram, tamil nadu, 6543211, India','hasan m','h@gmail.com','987654321','2026-01-22 13:23:33','2026-01-22 13:25:18',NULL,'2026-01-28','TRK2137637014','2026-01-23 13:23:33','2026-01-24 13:23:33'),(19,5,NULL,199.00,'paid','upi','delivered','tvs st, thondi, tamil nadu, 654321, India','hasan m','h@gmail.com','9876543211','2026-02-03 07:43:46','2026-02-03 08:39:23',NULL,'2026-02-06','TRK6263462138','2026-02-04 07:43:46','2026-02-05 07:43:46'),(20,5,NULL,199.00,'paid','upi','delivered','tvs, thondi, tamilnadu, 876543, India','hasan m','h@gmail.com','987654321','2026-02-03 07:47:16','2026-02-04 09:00:02',NULL,'2026-02-06','TRK8361053530','2026-02-04 08:49:14','2026-02-05 02:17:16'),(29,5,NULL,447.00,'paid','cod','delivered','supuramaniyapuram, trichy, tamilnadu, 654321, India','hasan m','h@gmail.com','987654322','2026-02-07 07:15:14','2026-02-07 07:41:46',NULL,'2026-02-12','TRK5143906529','2026-02-07 02:11:46','2026-02-07 02:11:46'),(30,5,NULL,199.00,'paid','upi','shipped','TVS, trichy, tamil nadu, 654321, India','hasan m','h@gmail.com','987654322','2026-02-07 07:34:23','2026-02-18 07:24:31',NULL,'2026-02-11','TRK6635311136','2026-02-18 01:54:30',NULL),(31,9,NULL,179.00,'pending','cod','pending','pallivaasal st, thondi, tamilnadu, 654321, India','Mohammed m','m@gmail.com','987654321','2026-02-07 07:45:25',NULL,NULL,'2026-02-12','TRK3257254433',NULL,NULL),(32,5,NULL,199.00,'paid','upi','pending','thondi, ramnad, tamilnadu, 654321, India','hasan m','h@gmail.com','987654321','2026-02-10 05:05:57',NULL,NULL,'2026-02-13','TRK9571710636',NULL,NULL),(33,9,NULL,199.00,'paid','upi','pending','thondi, ramnad, tamilnadu, 532111, India','Mohammed m','m@gmail.com','9876543211','2026-02-10 07:13:00',NULL,NULL,'2026-02-13','TRK5807095627',NULL,NULL),(34,5,NULL,180.00,'pending','cod','delivered','thondi, ramnad, tamilnadu, 654321, India','hasan m','h@gmail.com','9876543211','2026-02-18 07:22:31','2026-03-26 15:13:35',NULL,'2026-02-23','TRK3515770461','2026-03-26 09:43:35','2026-03-26 09:43:35'),(35,9,NULL,199.00,'paid','upi','confirmed','pallivasal st, thondi, tamilnadu, 654321, India','Mohammed Hasan','m@gmail.com','9489624321','2026-02-23 10:52:08','2026-02-23 11:09:16',NULL,'2026-02-27','TRK9280985669',NULL,NULL),(36,5,NULL,200.00,'paid','upi','pending','tvs toll gate, trichy, tamil nadu, 620020, India','hasan mohd','h@gmail.com','876543211','2026-03-26 15:16:02',NULL,NULL,'2026-03-31','TRK1625965818',NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `url` varchar(500) NOT NULL,
  `is_main` tinyint(1) DEFAULT '0',
  `alt_text` varchar(200) DEFAULT '',
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_is_main` (`is_main`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (1,1,'/uploads/1769022353024-682391509.jpeg',1,'Hibiscus shampoo image 1','2026-01-21 19:05:53'),(2,2,'/uploads/1769086611871-928669907.jpeg',1,'Charcoal Face Wash image 1','2026-01-22 12:56:51'),(3,3,'/uploads/1769086797357-705996389.jpeg',1,'Red Wine Soap image 1','2026-01-22 12:59:57'),(4,4,'/uploads/1769086890830-756702137.jpeg',1,'Red Wine Face Brightening Gel image 1','2026-01-22 13:01:30'),(5,5,'/uploads/1769087001362-9538587.jpeg',1,'Rosemary Hair Growth Spray image 1','2026-01-22 13:03:21'),(6,6,'/uploads/1769087141037-109602913.jpeg',1,'Tan Removal Body Lotion image 1','2026-01-22 13:05:41'),(7,7,'/uploads/1769087219960-396131573.jpeg',1,'Under Eye Serum image 1','2026-01-22 13:07:00'),(8,8,'/uploads/1769087446004-462629444.jpeg',1,'Kumkummadi Serum image 1','2026-01-22 13:10:46'),(9,9,'/uploads/1769087574922-924454093.jpeg',1,'Red Color Lipstick image 1','2026-01-22 13:12:55'),(10,10,'/uploads/1769087684116-85803695.jpeg',1,'Rose Mere Hair Water Serum image 1','2026-01-22 13:14:44'),(11,11,'/uploads/1769087808511-587465815.jpeg',1,'Hair Remove Powder (50g) image 1','2026-01-22 13:16:48'),(12,12,'/uploads/1769087910932-22352639.jpeg',1,'Aloevera Face Gel image 1','2026-01-22 13:18:30'),(13,13,'/uploads/1769088011384-527332912.jpeg',1,'Nalangu Maavu Soap image 1','2026-01-22 13:20:11');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_price_backup`
--

DROP TABLE IF EXISTS `product_price_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_price_backup` (
  `id` int NOT NULL DEFAULT '0',
  `name` varchar(255) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `stock` int DEFAULT '0',
  `image` varchar(500) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `ingredients` text,
  `benefits` text,
  `tags` varchar(500) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT '0.00',
  `review_count` int DEFAULT '0',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `average_rating` decimal(3,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_price_backup`
--

LOCK TABLES `product_price_backup` WRITE;
/*!40000 ALTER TABLE `product_price_backup` DISABLE KEYS */;
INSERT INTO `product_price_backup` VALUES (1,'Aloe Vera Gel','Pure organic aloe vera gel for soothing and hydrating skin',11172.03,120.00,25,NULL,1,'Organic Aloe Vera, Vitamin E','Hydrates, Soothes, Reduces Inflammation','bestseller,organic',4.80,234,1,0,'2025-11-19 14:35:39',0.00);
/*!40000 ALTER TABLE `product_price_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `original_price` decimal(10,2) DEFAULT NULL,
  `stock` int DEFAULT '0',
  `image` varchar(500) DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `ingredients` text,
  `benefits` text,
  `tags` varchar(500) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT '0.00',
  `review_count` int DEFAULT '0',
  `total_sold` int DEFAULT '0',
  `total_revenue` decimal(10,2) DEFAULT '0.00',
  `last_sold_date` datetime DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `average_rating` decimal(3,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `images` varchar(2000) DEFAULT '[]',
  `is_deleted` tinyint(1) DEFAULT '0',
  `variants` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Hibiscus shampoo','A gentle herbal shampoo enriched with hibiscus that cleanses the scalp, reduces hair fall, and promotes strong, healthy hair naturally.',150.00,174.94,20,'/uploads/1769022353024-682391509.jpeg',NULL,2,'Hibiscus Flower Extract – Strengthens hair roots and reduces hair fall','Long, silk ,\n\nSolve dry hair, hair spilit problems,\n\nAnti Hair Fall,\n\nBest For Lies & Anti Dadruff.','new',0.00,0,0,0.00,NULL,1,1,'2026-01-21 19:05:39',0.00,'2026-02-23 07:22:22','[]',0,'[{\"size\": \"100ml\", \"price\": \"150\"}, {\"size\": \"200ml\", \"price\": \"298.97\"}]'),(2,'Charcoal Face Wash','Organic charcoal facewash that gently removes dirt, excess oil, and impurities, leaving your skin fresh and clear.',150.00,170.00,21,'/uploads/1769086611871-928669907.jpeg',NULL,1,'Activated Charcoal – Deeply cleanses pores and removes dirt, oil, and toxins.','DEEP CLEANING\n\n REDUCES ACNE\n\n IMPROVES SKIN TEXTURE\n BALANCES OILY SKIN\n REMOVE TOXINS','new',0.00,0,1,150.00,'2026-03-26 20:46:02',1,1,'2026-01-22 12:36:55',0.00,'2026-03-26 15:16:02','[]',0,'[{\"size\": \"100ml\", \"price\": \"180\"}]'),(3,'Red Wine Soap','A luxurious handmade soap enriched with red wine that gently cleanses, nourishes the skin, and helps improve glow and youthful appearance.',130.00,150.00,22,'/uploads/1769086797357-705996389.jpeg',NULL,3,'Red Wine Extract – Rich in antioxidants, helps improve skin glow and reduce signs of aging.','Moisturizes Skin\n\nImproves Elasticity\n\nProvides Natural Glow\n\nGives Luxurious Fragrance\n\nBoosts Skin Health\n\nBoosts Collagen','',0.00,0,1,130.00,'2026-02-18 12:52:31',1,1,'2026-01-22 12:59:49',0.00,'2026-02-18 07:22:31','[]',0,NULL),(4,'Red Wine Face Brightening Gel','A lightweight face gel enriched with red wine antioxidants that hydrates the skin, enhances natural brightness, and helps improve an even skin tone.',145.00,165.00,17,'/uploads/1769086890830-756702137.jpeg',NULL,1,'Red Wine Extract – Rich in antioxidants, helps brighten skin and reduce dullness','Promotes Glowing Skin\n\nEvens Skin Tone\n\nControls Wrinkles & Finelines\n\nBrightens Skin Tone','',0.00,0,0,0.00,NULL,1,1,'2026-01-22 13:01:24',0.00,'2026-02-23 07:21:28','[]',0,'[{\"size\": \"50ml\", \"price\": \"145\"}]'),(5,'Rosemary Hair Growth Spray','A refreshing herbal hair spray enriched with rosemary that helps stimulate hair growth, strengthen roots, and improve scalp health naturally.',180.00,199.97,23,'/uploads/1769087001362-9538587.jpeg',NULL,2,'Rosemary Extract / Rosemary Essential Oil – Stimulates hair follicles and promotes healthy hair growth.','Strengthens Hair from the roots\n\nImproves hair growth\n\nThickness hair strands\n\nAdds long lasting shine\n\nConditions dry hair','new',0.00,0,0,0.00,NULL,0,1,'2026-01-22 13:03:07',0.00,'2026-02-23 07:20:34','[]',0,'[{\"size\": \"100ml\", \"price\": \"180\"}, {\"size\": \"150ml\", \"price\": \"279.96\"}]'),(6,'Tan Removal Body Lotion','A lightweight body lotion formulated to help reduce tan, even out skin tone, and deeply moisturize the skin for a soft, radiant glow.',170.00,190.00,20,'/uploads/1769087141037-109602913.jpeg',NULL,3,'Made with aloe vera, licorice, turmeric, papaya, and natural moisturizing ingredients.','To nourish dry skin and keep your skin moist so that it is always healthy, remove tan, brightens skin, hydrate','',0.00,0,0,0.00,NULL,1,1,'2026-01-22 13:05:28',0.00,'2026-02-23 07:19:50','[]',0,'[{\"size\": \"100ml\", \"price\": \"170\"}, {\"size\": \"150ml\", \"price\": \"240\"}]'),(7,'Under Eye Serum','A lightweight under eye serum formulated to reduce dark circles, puffiness, and fine lines while deeply hydrating and refreshing the delicate eye area.',140.00,150.00,20,'/uploads/1769087219960-396131573.jpeg',NULL,1,'Made with caffeine, hyaluronic acid, aloe vera, and skin-brightening ingredients.','Reduces Dark Circles\n\nBrightens Around Eyes\n\nHydrates Under-Eye Area\n\nReduces Puffiness','',0.00,0,0,0.00,NULL,1,1,'2026-01-22 13:06:55',0.00,'2026-02-23 07:19:04','[]',0,'[{\"size\": \"20ml\", \"price\": \"140\"}, {\"size\": \"30ml\", \"price\": \"180\"}]'),(8,'Kumkummadi Serum','A traditional Ayurvedic facial serum enriched with Kumkummadi oil that helps brighten skin, reduce pigmentation, and restore a natural, healthy glow.',149.00,198.96,49,'/uploads/1769087446004-462629444.jpeg',NULL,1,'Made with Kumkummadi tailam, saffron, aloe vera, licorice, and Ayurvedic herbal extracts.','Improves skin complexion\n\nTreats pigmentation\n\nPrevents acne and pimples\n\nDiminishes spots and blemishes\n\nUsed as sunscreen\n\nReduces scars\n\nRemoves suntan\n\nHeals wounds\n\nDefy the signs of ageing\n\nRemoves dark','Bestseller',0.00,0,1,149.00,'2026-02-23 16:22:08',1,1,'2026-01-22 13:10:31',0.00,'2026-02-23 10:52:08','[]',0,'[{\"size\": \"20ml\", \"price\": \"149\"}, {\"size\": \"30ml\", \"price\": \"178.97\"}]'),(9,'Red Color Lipstick','A rich red lipstick with intense color payoff that glides smoothly, keeps lips moisturized, and delivers a bold, long-lasting finish.',120.00,149.00,28,'/uploads/1769087574922-924454093.jpeg',NULL,1,'Made with natural waxes, nourishing oils, vitamin E, and safe color pigments.','no chemical no side effect only natural ingredients used for women and kids','',0.00,0,0,0.00,NULL,0,1,'2026-01-22 13:12:48',0.00,'2026-01-22 13:12:55','[]',0,NULL),(10,'Rose Mere Hair Water Serum','A lightweight hair water serum infused with rose and herbal extracts that hydrates the scalp, strengthens hair roots, and leaves hair soft, shiny, and refreshed.',129.00,149.00,11,'/uploads/1769087684116-85803695.jpeg',NULL,2,'Made with pure rose water, aloe vera, panthenol, and hydrating herbal extracts.','Increase in hair growth.\n\nReduce hair fall in 14 days visible baby hairs improvement in hair density','',0.00,0,1,129.00,'2026-02-07 13:15:25',1,1,'2026-01-22 13:14:34',0.00,'2026-02-23 07:17:37','[]',0,'[{\"size\": \"20ml\", \"price\": \"129\"}, {\"size\": \"30\", \"price\": \"169\"}]'),(11,'Hair Remove Powder','A gentle and effective hair removal powder that helps remove unwanted body hair quickly while leaving the skin smooth and clean.',149.00,199.00,17,'/uploads/1769087808511-587465815.jpeg',NULL,2,'Made with aloe vera, turmeric, sandalwood, and skin-soothing ingredients.','Painless & instant hair removal\n\nTan free glowing skin\n\nZero side effects\n\nRemove hair & dead cells\n\nNo irritation\n\nReduce hair growth','',0.00,0,3,447.00,'2026-02-07 12:45:14',1,1,'2026-01-22 13:16:43',0.00,'2026-02-23 07:05:59','[]',0,'[{\"size\": \"50gm\", \"price\": \"149\"}, {\"size\": \"30gm\", \"price\": \"119.98\"}]'),(12,'Aloevera Face Gel','A gentle face wash enriched with aloe vera that cleanses the skin, removes impurities, and keeps the skin fresh, soft, and hydrated.',149.00,199.00,37,'/uploads/1769087910932-22352639.jpeg',NULL,1,'Made with aloe vera, neem, cucumber, and natural skin-friendly ingredients.','Hydrates the skin\n\nSoothes sunburns and irritation\n\nMoisturises extra dry skin\n\nBeneficial for after shaving & waxing\n\nMinimises open pores\n\nGives natural glow','',0.00,0,3,447.00,'2026-02-10 12:43:00',1,1,'2026-01-22 13:18:23',0.00,'2026-02-23 07:16:12','[]',0,'[{\"size\": \"100ml\", \"price\": \"149\"}, {\"size\": \"150ml\", \"price\": \"229\"}]'),(13,'Nalangu Maavu Soap','A traditional herbal soap made with Nalangu Maavu that gently cleanses the skin, removes tan, and enhances natural glow while keeping the skin soft and healthy.',149.00,198.96,46,'/uploads/1769088011384-527332912.jpeg',NULL,3,'Made with Nalangu Maavu, kasturi turmeric, sandalwood, and traditional herbal ingredients.','Brightens Skin\n\nPrevents Body Odor\n\nFights Acne\n\nNatural Cleanser\n\nControls Oil','bestseler',0.00,0,4,596.00,'2026-02-10 10:35:57',1,1,'2026-01-22 13:20:05',0.00,'2026-02-10 05:05:57','[]',0,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_items`
--

DROP TABLE IF EXISTS `return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_id` int NOT NULL,
  `order_item_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `return_id` (`return_id`),
  KEY `order_item_id` (`order_item_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `return_items_ibfk_1` FOREIGN KEY (`return_id`) REFERENCES `returns_exchanges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_items_ibfk_2` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`),
  CONSTRAINT `return_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_items`
--

LOCK TABLES `return_items` WRITE;
/*!40000 ALTER TABLE `return_items` DISABLE KEYS */;
INSERT INTO `return_items` VALUES (1,1,11,11,3,'wrong_item','pending','2026-02-18 06:01:46'),(2,2,1,13,1,'others','pending','2026-02-18 07:20:21');
/*!40000 ALTER TABLE `return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `returns_exchanges`
--

DROP TABLE IF EXISTS `returns_exchanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `returns_exchanges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('return','exchange') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `description` text,
  `status` enum('requested','approved','rejected','processing','completed','cancelled') DEFAULT 'requested',
  `refund_amount` decimal(10,2) DEFAULT NULL,
  `exchange_product_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `admin_notes` text,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`),
  KEY `exchange_product_id` (`exchange_product_id`),
  CONSTRAINT `returns_exchanges_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `returns_exchanges_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `returns_exchanges_ibfk_3` FOREIGN KEY (`exchange_product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `returns_exchanges`
--

LOCK TABLES `returns_exchanges` WRITE;
/*!40000 ALTER TABLE `returns_exchanges` DISABLE KEYS */;
INSERT INTO `returns_exchanges` VALUES (1,29,5,'return','wrong_item','','completed',447.00,NULL,'2026-02-18 06:01:46','2026-03-26 15:13:46',''),(2,17,5,'return','others','','completed',149.00,NULL,'2026-02-18 07:20:21','2026-02-23 07:22:55','');
/*!40000 ALTER TABLE `returns_exchanges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `product_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text,
  `images` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review` (`order_id`,`product_id`,`user_id`),
  KEY `product_id` (`product_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (2,1,12,5,5,'super',NULL,'2026-02-03 06:36:16','2026-02-03 06:36:16'),(3,1,13,5,5,'good products',NULL,'2026-02-03 06:47:49','2026-02-03 06:47:49'),(4,NULL,11,5,5,'Super',NULL,'2026-02-07 07:59:01','2026-02-07 07:59:01');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `phone` varchar(20) DEFAULT '',
  `address` text,
  `city` varchar(100) DEFAULT '',
  `state` varchar(100) DEFAULT '',
  `zip_code` varchar(20) DEFAULT '',
  `customer_email` varchar(100) DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,'Admin User','admin@organicbeauty.com','admin123','admin','2025-11-19 16:40:23','',NULL,'','','','admin@organicbeauty.com'),(5,'hasan','h@gmail.com','h123','user','2025-11-20 15:37:56','98765431',NULL,NULL,NULL,NULL,'h@gmail.com'),(9,'Mohammed','m@gmail.com','Mohd123','user','2026-02-07 07:44:33',NULL,NULL,'','','','');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlist`
--

DROP TABLE IF EXISTS `wishlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_wishlist` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `wishlist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `wishlist_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlist`
--

LOCK TABLES `wishlist` WRITE;
/*!40000 ALTER TABLE `wishlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `wishlist` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-02 12:28:30
