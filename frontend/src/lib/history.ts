import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import type { Assessment } from '@lucida/shared';
import { db } from './firebase.js';

/** Each teacher's assessments live under their own uid — Firestore rules enforce that a user can only reach their own subcollection. */
function assessmentsRef(uid: string) {
  return collection(db, 'users', uid, 'assessments');
}

export async function saveAssessment(uid: string, assessment: Assessment): Promise<void> {
  await setDoc(doc(assessmentsRef(uid), assessment.id), assessment);
}

export async function listAssessments(uid: string): Promise<Assessment[]> {
  const snap = await getDocs(query(assessmentsRef(uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => d.data() as Assessment);
}

export async function deleteAssessment(uid: string, assessmentId: string): Promise<void> {
  await deleteDoc(doc(assessmentsRef(uid), assessmentId));
}
