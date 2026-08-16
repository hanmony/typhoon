import { Pipe, PipeTransform } from '@angular/core';

/**
 * ValueOf Pipe
 */
@Pipe({ name: 'valueOf', standalone: true })
export class ValueOfPipe implements PipeTransform {
  transform(obj: any, key: string): unknown {
    if (!obj) {
      return undefined;
    }
    return obj[key];
  }
}
