/**
 * Deep merge two objects, the source will override keys in the target
 * @param target
 * @param source
 */
export function mergeDeep(target: object, source: object): object {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = mergeDeep(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

export function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

