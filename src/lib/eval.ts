// terrible eval method with context
// https://stackoverflow.com/a/61805744
function create_context_function_template(eval_string, context) {
    return `
  return function (context) {
    "use strict";
    ${Object.keys(context).length > 0
        ? `let ${Object.keys(context).map((key) => ` ${key} = context['${key}']`)};`
        : ``
    }
    return ${eval_string};
  }                                                                                                                   
  `
}

function make_context_evaluator(eval_string, context) {
    let template = create_context_function_template(eval_string, context)
    let functor = Function(template)
    return functor()
}

export function evalInContext(text: string, context: object = {}) {
    let evaluator = make_context_evaluator(text, context)
    try {
        return evaluator(context);
    } catch {
        return null;
    }
}