import { useContext } from 'react'

import { WilayahMasterContext } from '../context/WilayahMasterContext'

export function useWilayahMaster() {
  const context = useContext(WilayahMasterContext)

  if (!context) {
    throw new Error('useWilayahMaster harus digunakan di dalam WilayahMasterProvider.')
  }

  return context
}
