export function parse(input: string, options?: {node_compat: string}): any;
export function stringify(input: any): string;
export function format(input: string, options?: {
    indent_size: number,
    array_delimeter: string,
    tuple_delimeter: string,
    object_key_delimeter: string,
    object_delimeter: string,
    set_delimeter: string,
    dict_key_delimeter: string,
    dict_delimeter: string,
    node_attribute_delimeter: string,
    node_attribute_key_delimeter: string,
    top_level_object: boolean,
}): string;