/**
 * BaseUseCase — the shape every use case shares
 * ---------------------------------------------------------------------------
 * A "use case" is a single application operation (register a user, get the car
 * catalog, view a report). Giving them all one tiny contract — a single
 * `execute(input)` method — makes the codebase highly predictable: a controller
 * always just calls `someUseCase.execute(...)`, and each file does exactly one
 * thing.
 *
 * The generics let each use case declare its own input and output types while
 * still fitting the common mould.
 */
export abstract class BaseUseCase<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>;
}
