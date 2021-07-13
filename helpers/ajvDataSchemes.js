const schema = {
    type: "object",
    properties: {
      foo: {type: "integer"},
      bar: {type: "string"}
    },
    required: ["foo"],
    additionalProperties: false
  }
  
  const data = {foo: 1, bar: "abc"}
