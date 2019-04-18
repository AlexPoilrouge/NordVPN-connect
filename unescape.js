const jsEscapeRegex = /\\(u\{([0-9A-Fa-f]+)\}|u([0-9A-Fa-f]{4})|x([0-9A-Fa-f]{2})|([1-7][0-7]{0,2}|[0-7]{2,3})|(['"tbrnfv0\\]))|\\U([0-9A-Fa-f]{8})/g;

const usualEscapeSequences = {
    '0': '\0',
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '\'': '\'',
    '"': '"',
    '\\': '\\'
};

const fromHex = (str) => String.fromCodePoint(parseInt(str, 16));
const fromOct = (str) => String.fromCodePoint(parseInt(str, 8));

/**
 * In certain cases, special characted (e.g. '\n') are not interpreted
 * but are provided in a string as they were 2 seperate characters (i.e. '\' and 'n').
 * 
 * This function helps to sets things right.
 * 
 * @param {String} str 
 */
function convert(str) {
    return str.replace(jsEscapeRegex, (_, __, varHex, longHex, shortHex, octal, specialCharacter, python) => {
        if (varHex !== undefined) {
            return fromHex(varHex);
        } else if (longHex !== undefined) {
            return fromHex(longHex);
        } else if (shortHex !== undefined) {
            return fromHex(shortHex);
        } else if (octal !== undefined) {
            return fromOct(octal);
        } else if (python !== undefined) {
            return fromHex(python);
        } else {
            return usualEscapeSequences[specialCharacter];
        }
    });
}
