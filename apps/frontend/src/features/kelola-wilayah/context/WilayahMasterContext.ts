import { createContext } from 'react'

import type { WilayahMasterValue } from '../types'

export const WilayahMasterContext = createContext<WilayahMasterValue | null>(null)
