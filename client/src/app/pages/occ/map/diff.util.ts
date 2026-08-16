export function diffEvents(
  current: ExtremeOcc.Event[],
  previous: ExtremeOcc.Event[],
): ExtremeOcc.EventDiffResult {
  // 将数组转为 Map 以便快速查找（使用 id 作为键）
  const prevMap = new Map<string, ExtremeOcc.Event>(
    previous.map((event) => [event.id, event]),
  );
  const currentMap = new Map<string, ExtremeOcc.Event>(
    current.map((event) => [event.id, event]),
  );

  // 1. 找出新增事件（存在于 current 但不存在于 previous）
  const added = current.filter((event) => !prevMap.has(event.id));

  // 2. 找出删除事件（存在于 previous 但不存在于 current）
  const removed = previous.filter((event) => !currentMap.has(event.id));

  // 3. 找出属性变化的事件
  const changed: ExtremeOcc.EventChange[] = [];
  current.forEach((currentEvent) => {
    const prevEvent = prevMap.get(currentEvent.id);
    if (prevEvent) {
      // 只处理两个列表中都存在的事件
      const changes: Record<
        string,
        { old: any; new: any; entity: ExtremeOcc.Event }
      > = {};

      // 遍历所有属性进行对比（排除 id 和 createTime）
      (Object.keys(currentEvent) as (keyof ExtremeOcc.Event)[]).forEach(
        (key) => {
          if (key === 'id' || key === 'createTime') return; // 这些字段不需要比较

          const currentValue = currentEvent[key];
          const previousValue = prevEvent[key];

          // 深度比较（处理数组/对象的情况）
          if (!isEqual(currentValue, previousValue)) {
            changes[key] = {
              old: previousValue,
              new: currentValue,
              entity: currentEvent,
            };
          }
        },
      );

      if (Object.keys(changes).length > 0) {
        changed.push({
          id: currentEvent.id,
          changes,
          entity: currentEvent,
        });
      }
    }
  });

  return { added, removed, changed };
}

export function diffOperations(
  current: ExtremeOcc.Operation[],
  previous: ExtremeOcc.Operation[],
): ExtremeOcc.OperationDiffResult {
  // 将数组转为 Map 以便快速查找（使用 id 作为键）
  const prevMap = new Map<string, ExtremeOcc.Operation>(
    previous.map((event) => [event.id, event]),
  );
  const currentMap = new Map<string, ExtremeOcc.Operation>(
    current.map((event) => [event.id, event]),
  );

  // 1. 找出新增操作（存在于 current 但不存在于 previous）
  const added = current.filter((event) => !prevMap.has(event.id));

  // 2. 找出删除操作（存在于 previous 但不存在于 current）
  const removed = previous.filter((event) => !currentMap.has(event.id));

  // 3. 找出属性变化的操作
  const changed: ExtremeOcc.OperationChange[] = [];
  current.forEach((currentEvent) => {
    const prevEvent = prevMap.get(currentEvent.id);
    if (prevEvent) {
      // 只处理两个列表中都存在的操作
      const changes: Record<string, { old: any; new: any }> = {};

      // 遍历所有属性进行对比（排除 id 和 createTime）
      (Object.keys(currentEvent) as (keyof ExtremeOcc.Operation)[]).forEach(
        (key) => {
          if (key === 'id' || key === 'createTime') return; // 这些字段不需要比较

          const currentValue = currentEvent[key];
          const previousValue = prevEvent[key];

          // 深度比较（处理数组/对象的情况）
          if (!isEqual(currentValue, previousValue)) {
            changes[key] = {
              old: previousValue,
              new: currentValue,
            };
          }
        },
      );

      if (Object.keys(changes).length > 0) {
        changed.push({
          id: currentEvent.id,
          changes,
        });
      }
    }
  });

  return { added, removed, changed };
}

// 深度比较函数（处理基本类型、数组和对象）
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;

  // 处理数组比较
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((val, index) => isEqual(val, b[index]))
    );
  }

  // 处理对象比较
  if (
    typeof a === 'object' &&
    a !== null &&
    typeof b === 'object' &&
    b !== null
  ) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => isEqual(a[key], b[key]) && keysB.includes(key));
  }

  return false;
}
