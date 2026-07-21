-- V34: users.email is nullable (email is optional at account creation), but SQL Server's plain
-- UNIQUE constraint treats NULL as a comparable value and only allows ONE NULL — so the second
-- staff account ever created without an email hits "Violation of UNIQUE KEY constraint" on NULL.
-- Replace the constraint with a filtered unique index that only enforces uniqueness among
-- non-null emails, matching the intended business rule ("no two accounts share an email").

DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = kc.name
FROM sys.key_constraints kc
JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE kc.parent_object_id = OBJECT_ID('dbo.users') AND c.name = 'email' AND kc.type = 'UQ';

IF @constraintName IS NOT NULL
BEGIN
    DECLARE @sql NVARCHAR(500) = N'ALTER TABLE users DROP CONSTRAINT ' + QUOTENAME(@constraintName);
    EXEC sp_executesql @sql;
END

CREATE UNIQUE NONCLUSTERED INDEX UQ_users_email ON users(email) WHERE email IS NOT NULL;
