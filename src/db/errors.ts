export class EntityNotFoundError extends Error {
  readonly entity: string;
  readonly id: string;

  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'EntityNotFoundError';
    this.entity = entity;
    this.id = id;
  }
}
