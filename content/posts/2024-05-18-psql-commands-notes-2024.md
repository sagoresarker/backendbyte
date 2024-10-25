---
title: "Getting Started with PostgreSQL: Essential psql Command Line Skills for Beginners"
date: 2024-05-18
author: "Backend Byte"
description: "A beginner's guide to mastering PostgreSQL and essential psql command line skills."
tags: ["psql"]
showToc: true
TocOpen: false
draft: false
hidemeta: false
comments: true
canonicalURL: "http://backendbyte.com/posts/2024-05-18-postgresql-psql-basics/"
disableHLJS: false
disableShare: false
hideSummary: false
searchHidden: false
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---
![Getting Started with PostgreSQL: Essential psql Command Line Skills for Beginners](/images/posts/2024/postgres-copy-cmd/postgresql-copy-cmd.png)
Nearly three years ago, I upgraded to Ubuntu 22.04 LTS. After the upgrade, I ran into problems with pgAdmin 4 when working with PostgreSQL. As a result, I had to rely on the psql interactive shell for all my tasks. Here, I will share some basic psql commands that I frequently use.

## 1. Enter psql shell

To interact with PostgreSQL from the terminal, enter the `psql` shell. To enter the `psql` shell, type:

```bash
sudo su - postgres
```

`sudo su - postgres` is a command used to run a specific command as the `postgres` user. After entering this command, type `psql` to enter the PostgreSQL interactive terminal as the `postgres` user. It allows you to execute various SQL commands and interact with the PostgreSQL database.

You can do the same task with a single command:

```bash
sudo -u postgres psql
```

It will give you access to the PostgreSQL interactive terminal.

## 2. Create User

To create a user, type:

```sql
CREATE USER username WITH PASSWORD 'password';
```

One thing to mention is to write your password inside the inverted comma. And don’t forget to add a semicolon at the end of the statement.

## 3. Create Database

To create a database, enter:

```sql
CREATE DATABASE database_name;
```

## 4. Add User to Database

To add your newly created user to any of your previously created databases, type:

```sql
GRANT ALL PRIVILEGES ON DATABASE <database name> TO <username>;
```

## 5. Display Database List

To show the created database list, type:

```sql
\l
```

It will show a list of all databases on the server.

## 6. Select Database

To switch/connect a specific database, in this case, your newly created one, type:

```sql
\c <database name>
```

## 7. Show Table

To show all the tables in your database, type:

```sql
\dt
```

or

```sql
/d
```

It will print a list of all tables in the current database. The `\dt` command lists all the tables in the current database. It is a shortcut for the `\d tables` command, which displays only the tables in the database.

## 8. Create a Table

To create a table, write your queries. We want to create a table `LinkedInPost` containing `id`, `post_title`, `post_content`, `post_date` fields. To create this, type this command in your shell:

```sql
CREATE TABLE LinkedInPosts (
   id SERIAL PRIMARY KEY,
   post_title VARCHAR(255),
   post_content TEXT,
   post_date TIMESTAMP DEFAULT NOW()
);
```

## 9. Rename a Column

To rename any column in a table in PostgreSQL using `psql` interactive shell, you can use the `ALTER TABLE` statement with the `RENAME COLUMN` clause. For example, to rename `post_title` column to `post_featured_title`, type:

```sql
ALTER TABLE LinkedInPost RENAME COLUMN post_title TO post_featured_title;
```

It will rename the column `post_title` to `post_featured_title`.

## 10. Delete a Column

To delete a column from a table in PostgreSQL using `psql` interactive shell, use the `ALTER TABLE` statement with the `DROP COLUMN` clause. For example, to delete the `post_content` field from your `LinkedInPost` table, type:

```sql
ALTER TABLE LinkedInPost DROP COLUMN post_content;
```

## 11. Index a Column

To index a column to make your query faster, suppose you want to index the `id` column. To create an index on the `id` field of the `LinkedInPost` table in PostgreSQL, you can use the `CREATE INDEX` statement. Type:

```sql
CREATE INDEX idx_id ON LinkedInPost(id);
```

It will create an index column `idx_id` based on the `id` column.

## 12. Delete the Database
To delete a table, type:
```sql
DROP DATABASE LinkedInPost;
```
The database you created before is deleted successfully.

## 13. Delete Database Issue
If you encounter an error when trying to delete the database, like:

```plaintext
ERROR: database "LinkedInPost_db" is being accessed by other user
DETAIL: There are 3 other sessions using the database.
```
It occurs because after creating the database, I connect it with pgAdmin 4. If you encounter this type of issue, type:

```sql
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'LinkedInPost_db'
AND pid <> pg_backend_pid();
```
It will terminate all the connections to the database except the one you are currently using.

**Note:** Before running this statement, please log in as the `postgres` user in the `psql` shell.

## 14. Backup your Database

To backup a database, please select the database by typing:

```sql
\c your_database_name
```

In our case, it will be:

```sql
\c LinkedInPost
```

Then type:

```bash
pg_dump -U postgres -Fc your_database_name > /path/to/your_backup_file_name.dump
```

In this command, `-U` specifies the user, `-Fc` specifies the format of the backup file as custom, `your_database_name` is the name of the database you want to backup, and `/path/to/your_backup_file_name.dump` is the path and name of the backup file you want to create.

## 15. Use the Backup File

To import a PostgreSQL backup file with a `.dump` file extension, you can use the `pg_restore` command-line tool. Type:
```bash
pg_restore -U username -d databasename filename.dump
```
In our case, it will be:
```bash
pg_restore -U postgres -d mydatabase mybackupfile.dump
```
You cannot use any custom file type in the `pg_dump` and `pg_restore` commands for the backup file type. The `pg_dump` command creates a custom binary file format for PostgreSQL with the file extension `.dump`. Similarly, `pg_restore` is designed to work only with the customized binary format generated by `pg_dump`.

With these commands, you cannot use JSON, Excel, or any other file format. The PostgreSQL custom binary format is widely used in the industry and is considered the standard for PostgreSQL backups and restores. While other file formats are available, such as plain text, CSV, and SQL, the custom binary format is preferred because it allows for faster backup and restore times, supports more advanced features, and is more secure.

To exit from the `psql` terminal, use:
```sql
\q
```
## Configure PostgreSQL with Django

If you are completely new to PostgreSQL and trying to connect it with the Python Django Framework, you might face an error during installing `psycopg2`, a popular PostgreSQL database adapter. You can try to run this code in your terminal:
```bash
sudo apt-get install --reinstall libpq-dev
pip install psycopg2
```
Another problem you might face during `python3 manage.py makemigrations` and `python3 manage.py migrate` is:
```plaintext
psycopg2.errors.InsufficientPrivilege: permission denied for table django_migrations
```
It's because of insufficient permission for the user you created before. To solve this issue, run another script in your `psql` interactive shell:
```sql
\c your_database_name
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO <username>;
```
It will solve your issue. You might ask, "I already granted permission to the database, why should I run another script again?". The answer is:
```sql
-- Permission on One Table
GRANT ALL PRIVILEGES ON TABLE side_adzone TO <username>;
-- Permission on All Tables of schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO <username>;
```
Hope your problem will be solved immediately. I found this piece of code after some trial and error.
## Conclusion
Learning essential `psql` command-line skills is an important step toward mastering PostgreSQL as a beginner. With the skills covered in this article, you are now equipped to create and manage databases, tables, and columns, as well as perform basic data manipulation tasks in PostgreSQL. As you continue to practice and learn more about PostgreSQL, you will discover that there is so much more you can do with the `psql` command-line interface. So go ahead and dive deeper into the world of PostgreSQL, and let the journey of mastering this powerful open-source relational database begin!

Thanks for reading! Hope you found this helpful.
