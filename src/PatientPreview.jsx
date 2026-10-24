import React from 'react';
import { ASSETS } from './assets';
import PatientPanel from './components/patient/PatientPanel';
// Optional preview entry. The main app does not import this file.
export default function PatientPreview(){return <PatientPanel logoUrl={ASSETS.logo}/>;}
