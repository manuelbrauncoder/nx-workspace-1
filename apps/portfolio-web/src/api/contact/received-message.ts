/** A message from the contact form as an admin reads it in the inbox. */
export interface ReceivedMessage {
  id: string;
  name: string;
  email: string;
  /** Plain text as the visitor typed it, with line breaks. */
  message: string;
  read: boolean;
  createdAt: Date;
}
