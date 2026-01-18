import { styleText } from 'node:util'


export const dim = (text: string) => styleText([ 'dim' ], text)

export const red = (text: string) => styleText([ 'red' ], text)

export const yellow = (text: string) => styleText([ 'yellow' ], text)

export const underline = (text: string) => styleText([ 'underline' ], text)

export const green = (text: string) => styleText([ 'green' ], text)
