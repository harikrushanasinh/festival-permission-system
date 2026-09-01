import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils.js';

// Migrations (database/migrations) use snake_case columns/tables by convention.
// This strategy makes TypeORM's runtime queries match that schema without
// annotating every @Column({ name: '...' }) by hand.
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(targetName: string, userSpecifiedName?: string): string {
    return userSpecifiedName ?? snakeCase(targetName) + 's';
  }

  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    const name = embeddedPrefixes.concat(customName ?? propertyName).join('_');
    return snakeCase(name);
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return snakeCase(`${firstTableName}_${secondTableName}`);
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
