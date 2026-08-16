export class InplaceValueChangedArgs<T = unknown> {
  obj?: unknown;
  key: string = '';
  value?: T;
}
