export function getPath(source, path) {
  return path.split('.').reduce((value, key) => {
    if (value === null || value === undefined) return '';
    return value[key];
  }, source);
}

export function stringifyValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function renderTemplate(template, data) {
  let output = template;
  const loopPattern = /{{#([\w.]+)}}([\s\S]*?){{\/\1}}/g;

  output = output.replace(loopPattern, (_, path, body) => {
    const list = getPath(data, path);
    if (!Array.isArray(list)) return '';
    return list
      .map((item, index) => {
        const scope = typeof item === 'object' && item !== null
          ? { ...data, ...item, this: item, index: index + 1 }
          : { ...data, this: item, index: index + 1 };
        return renderTemplate(body, scope);
      })
      .join('');
  });

  return output.replace(/{{([\w.]+)}}/g, (_, path) => stringifyValue(getPath(data, path)));
}

export function listPlaceholders(template) {
  const matches = [...template.matchAll(/{{[#\/]?([\w.]+)}}/g)];
  return [...new Set(matches.map((match) => match[1]))];
}
