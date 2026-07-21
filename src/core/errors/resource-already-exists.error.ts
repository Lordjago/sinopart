export class ResourceAlreadyExistsError extends Error {
  constructor(message: string = 'Resource already exists') {
    super(message);
    this.name = 'ResourceAlreadyExistsError';
  }
}
