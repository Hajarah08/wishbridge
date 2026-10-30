
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "accounts": {
                  Row: {
                    "created_at": string,"id": string,"role": Database["public"]['Enums']["app_role"],"status": Database["public"]['Enums']["account_status"],"status_changed_at": string | null,"status_reason": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"role"?: Database["public"]['Enums']["app_role"],"status"?: Database["public"]['Enums']["account_status"],"status_changed_at"?: string | null,"status_reason"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"status"?: Database["public"]['Enums']["account_status"],"status_changed_at"?: string | null,"status_reason"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": string,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role": string,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"description": string | null,"icon": string | null,"id": number,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: never,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: never,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contributions": {
                  Row: {
                    "amount_minor": number,"contributor_id": string | null,"created_at": string,"currency": string,"id": string,"idempotency_key": string,"is_anonymous": boolean,"message": string | null,"mode": Database["public"]['Enums']["payment_mode"],"provider": string,"provider_reference": string | null,"status": Database["public"]['Enums']["contribution_status"],"updated_at": string,"wish_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"contributor_id"?: string | null,"created_at"?: string,"currency": string,"id"?: string,"idempotency_key": string,"is_anonymous"?: boolean,"message"?: string | null,"mode"?: Database["public"]['Enums']["payment_mode"],"provider"?: string,"provider_reference"?: string | null,"status"?: Database["public"]['Enums']["contribution_status"],"updated_at"?: string,"wish_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"contributor_id"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"idempotency_key"?: string,"is_anonymous"?: boolean,"message"?: string | null,"mode"?: Database["public"]['Enums']["payment_mode"],"provider"?: string,"provider_reference"?: string | null,"status"?: Database["public"]['Enums']["contribution_status"],"updated_at"?: string,"wish_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contributions_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfilment_offers": {
                  Row: {
                    "cancelled_at": string | null,"completed_at": string | null,"created_at": string,"decided_at": string | null,"decision_note": string | null,"delivery_plan": string | null,"dispute_reason": string | null,"disputed_by": string | null,"giver_confirmed_at": string | null,"giver_id": string,"id": string,"idempotency_key": string,"is_anonymous": boolean,"message": string | null,"resolution_note": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["offer_status"],"updated_at": string,"wish_id": string,"wisher_confirmed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"delivery_plan"?: string | null,"dispute_reason"?: string | null,"disputed_by"?: string | null,"giver_confirmed_at"?: string | null,"giver_id": string,"id"?: string,"idempotency_key": string,"is_anonymous"?: boolean,"message"?: string | null,"resolution_note"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["offer_status"],"updated_at"?: string,"wish_id": string,"wisher_confirmed_at"?: string | null
                  }
                  Update: {
                    "cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"delivery_plan"?: string | null,"dispute_reason"?: string | null,"disputed_by"?: string | null,"giver_confirmed_at"?: string | null,"giver_id"?: string,"id"?: string,"idempotency_key"?: string,"is_anonymous"?: boolean,"message"?: string | null,"resolution_note"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["offer_status"],"updated_at"?: string,"wish_id"?: string,"wisher_confirmed_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfilment_offers_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfilment_offers_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"email_sent_at": string | null,"id": string,"link": string | null,"read_at": string | null,"title": string,"type": Database["public"]['Enums']["notification_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"email_sent_at"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title": string,"type": Database["public"]['Enums']["notification_type"],"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"email_sent_at"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["notification_type"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"offer_messages": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"offer_id": string,"sender_id": string | null,"sender_role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"offer_id": string,"sender_id"?: string | null,"sender_role": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"offer_id"?: string,"sender_id"?: string | null,"sender_role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_messages_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "fulfilment_offers"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_status_transitions": {
                  Row: {
                    "actor": string,"from_status": Database["public"]['Enums']["offer_status"],"to_status": Database["public"]['Enums']["offer_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"from_status": Database["public"]['Enums']["offer_status"],"to_status": Database["public"]['Enums']["offer_status"]
                  }
                  Update: {
                    "actor"?: string,"from_status"?: Database["public"]['Enums']["offer_status"],"to_status"?: Database["public"]['Enums']["offer_status"]
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "bio": string | null,"created_at": string,"id": string,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"id": string,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"id"?: string,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"refunds": {
                  Row: {
                    "amount_minor": number,"contribution_id": string,"created_at": string,"currency": string,"id": string,"mode": Database["public"]['Enums']["payment_mode"],"provider_reference": string | null,"reason": string | null,"requested_by": string | null,"status": Database["public"]['Enums']["refund_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"contribution_id": string,"created_at"?: string,"currency": string,"id"?: string,"mode"?: Database["public"]['Enums']["payment_mode"],"provider_reference"?: string | null,"reason"?: string | null,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"contribution_id"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"mode"?: Database["public"]['Enums']["payment_mode"],"provider_reference"?: string | null,"reason"?: string | null,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["refund_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refunds_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refunds_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "public_wish_supporters"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"handled_by": string | null,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["report_status"],"updated_at": string,"wish_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"handled_by"?: string | null,"id"?: string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"updated_at"?: string,"wish_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"handled_by"?: string | null,"id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"updated_at"?: string,"wish_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"support_requests": {
                  Row: {
                    "admin_note": string | null,"contact_email": string,"created_at": string,"id": string,"message": string,"status": Database["public"]['Enums']["support_status"],"subject": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"contact_email": string,"created_at"?: string,"id"?: string,"message": string,"status"?: Database["public"]['Enums']["support_status"],"subject": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"contact_email"?: string,"created_at"?: string,"id"?: string,"message"?: string,"status"?: Database["public"]['Enums']["support_status"],"subject"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"user_settings": {
                  Row: {
                    "anonymous_giving_default": boolean,"anonymous_wishing_default": boolean,"email_notifications": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymous_giving_default"?: boolean,"anonymous_wishing_default"?: boolean,"email_notifications"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "anonymous_giving_default"?: boolean,"anonymous_wishing_default"?: boolean,"email_notifications"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wish_images": {
                  Row: {
                    "alt_text": string | null,"created_at": string,"height": number | null,"id": string,"sort_order": number,"storage_path": string,"width": number | null,"wish_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"sort_order"?: number,"storage_path": string,"width"?: number | null,"wish_id": string
                  }
                  Update: {
                    "alt_text"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"sort_order"?: number,"storage_path"?: string,"width"?: number | null,"wish_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wish_images_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wish_images_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"wish_status_history": {
                  Row: {
                    "actor_id": string | null,"actor_role": string,"created_at": string,"from_status": Database["public"]['Enums']["wish_status"] | null,"id": number,"note": string | null,"to_status": Database["public"]['Enums']["wish_status"],"wish_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_role": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["wish_status"] | null,"id"?: never,"note"?: string | null,"to_status": Database["public"]['Enums']["wish_status"],"wish_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_role"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["wish_status"] | null,"id"?: never,"note"?: string | null,"to_status"?: Database["public"]['Enums']["wish_status"],"wish_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wish_status_history_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wish_status_history_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"wish_status_transitions": {
                  Row: {
                    "actor": string,"from_status": Database["public"]['Enums']["wish_status"],"to_status": Database["public"]['Enums']["wish_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"from_status": Database["public"]['Enums']["wish_status"],"to_status": Database["public"]['Enums']["wish_status"]
                  }
                  Update: {
                    "actor"?: string,"from_status"?: Database["public"]['Enums']["wish_status"],"to_status"?: Database["public"]['Enums']["wish_status"]
                  }
                  Relationships: [
                    
                  ]
                },"wishes": {
                  Row: {
                    "additional_info": string | null,"approved_at": string | null,"category_id": number,"country_code": string,"created_at": string,"currency": string | null,"description": string,"estimated_cost_minor": number | null,"fulfilled_at": string | null,"fulfilment_method": Database["public"]['Enums']["fulfilment_method"],"id": string,"is_featured": boolean,"moderation_note": string | null,"owner_id": string,"publish_on_approval": boolean,"published_at": string | null,"search": unknown,"show_when_fulfilled": boolean,"status": Database["public"]['Enums']["wish_status"],"status_before_suspension": Database["public"]['Enums']["wish_status"] | null,"submitted_at": string | null,"target_amount_minor": number | null,"title": string,"updated_at": string,"wish_type": Database["public"]['Enums']["wish_type"],"wisher_identity": Database["public"]['Enums']["wisher_identity"],"withdrawn_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_info"?: string | null,"approved_at"?: string | null,"category_id": number,"country_code": string,"created_at"?: string,"currency"?: string | null,"description": string,"estimated_cost_minor"?: number | null,"fulfilled_at"?: string | null,"fulfilment_method": Database["public"]['Enums']["fulfilment_method"],"id"?: string,"is_featured"?: boolean,"moderation_note"?: string | null,"owner_id": string,"publish_on_approval"?: boolean,"published_at"?: string | null,"search"?: never,"show_when_fulfilled"?: boolean,"status"?: Database["public"]['Enums']["wish_status"],"status_before_suspension"?: Database["public"]['Enums']["wish_status"] | null,"submitted_at"?: string | null,"target_amount_minor"?: number | null,"title": string,"updated_at"?: string,"wish_type": Database["public"]['Enums']["wish_type"],"wisher_identity"?: Database["public"]['Enums']["wisher_identity"],"withdrawn_at"?: string | null
                  }
                  Update: {
                    "additional_info"?: string | null,"approved_at"?: string | null,"category_id"?: number,"country_code"?: string,"created_at"?: string,"currency"?: string | null,"description"?: string,"estimated_cost_minor"?: number | null,"fulfilled_at"?: string | null,"fulfilment_method"?: Database["public"]['Enums']["fulfilment_method"],"id"?: string,"is_featured"?: boolean,"moderation_note"?: string | null,"owner_id"?: string,"publish_on_approval"?: boolean,"published_at"?: string | null,"search"?: never,"show_when_fulfilled"?: boolean,"status"?: Database["public"]['Enums']["wish_status"],"status_before_suspension"?: Database["public"]['Enums']["wish_status"] | null,"submitted_at"?: string | null,"target_amount_minor"?: number | null,"title"?: string,"updated_at"?: string,"wish_type"?: Database["public"]['Enums']["wish_type"],"wisher_identity"?: Database["public"]['Enums']["wisher_identity"],"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishes_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "public_wish_images": {
                  Row: {
                    "alt_text": string | null,"height": number | null,"id": string,"sort_order": number,"storage_path": string,"width": number | null,"wish_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "alt_text"?: string | null,"height"?: number | null,"id"?: string | null,"sort_order"?: number | null,"storage_path"?: string | null,"width"?: number | null,"wish_id"?: string | null
                         }
                        Update: {
                           "alt_text"?: string | null,"height"?: number | null,"id"?: string | null,"sort_order"?: number | null,"storage_path"?: string | null,"width"?: number | null,"wish_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "wish_images_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wish_images_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"public_wish_supporters": {
                  Row: {
                    "created_at": string,"id": string,"supporter_username": string | null,"wish_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "contributions_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "public_wishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_wish_id_fkey"
      columns: ["wish_id"]
isOneToOne: false
      referencedRelation: "wishes"
      referencedColumns: ["id"]
    }
                  ]
                },"public_wishes": {
                  Row: {
                    "additional_info": string | null,"category_icon": string | null,"category_name": string,"category_slug": string,"contribution_count": number | null,"country_code": string,"cover_image_path": string | null,"currency": string | null,"description": string,"estimated_cost_minor": number | null,"fulfilled_at": string | null,"fulfilment_method": Database["public"]['Enums']["fulfilment_method"],"id": string,"is_featured": boolean,"progress_percent": number | null,"published_at": string | null,"search": unknown,"status": Database["public"]['Enums']["wish_status"],"target_amount_minor": number | null,"test_pledged_minor": number | null,"title": string,"wish_type": Database["public"]['Enums']["wish_type"],"wisher_username": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "add_wish_image":
{ Args: { "p_alt_text"?: string,"p_height"?: number,"p_storage_path": string,"p_width"?: number,"p_wish_id": string }; Returns: string
                           },
"admin_list_users":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_search"?: string }; Returns: {
              "created_at": string,"email": string,"id": string,"last_sign_in_at": string,"offer_count": number,"role": Database["public"]['Enums']["app_role"],"status": Database["public"]['Enums']["account_status"],"status_reason": string,"total_count": number,"username": string,"wish_count": number
            }[]
                           },
"admin_moderate_wish":
{ Args: { "p_action": string,"p_note"?: string,"p_wish_id": string }; Returns: Database["public"]['Enums']["wish_status"]
                           },
"admin_refund_test_contribution":
{ Args: { "p_contribution_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_resolve_dispute":
{ Args: { "p_note": string,"p_offer_id": string,"p_outcome": string }; Returns: undefined
                           },
"admin_set_account_status":
{ Args: { "p_reason"?: string,"p_status": Database["public"]['Enums']["account_status"],"p_user_id": string }; Returns: undefined
                           },
"admin_set_featured":
{ Args: { "p_featured": boolean,"p_wish_id": string }; Returns: undefined
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_update_report":
{ Args: { "p_note"?: string,"p_report_id": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"admin_update_support":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["support_status"] }; Returns: undefined
                           },
"admin_upsert_category":
{ Args: { "p_description": string,"p_icon": string,"p_id": number,"p_is_active": boolean,"p_name": string,"p_slug": string,"p_sort_order": number }; Returns: number
                           },
"confirm_wish_fulfilled":
{ Args: { "p_wish_id": string }; Returns: undefined
                           },
"create_contribution_intent":
{ Args: { "p_amount_minor": number,"p_idempotency_key": string,"p_is_anonymous"?: boolean,"p_message"?: string,"p_wish_id": string }; Returns: string
                           },
"create_wish":
{ Args: { "p_additional_info"?: string,"p_category_slug": string,"p_country_code": string,"p_currency"?: string,"p_description": string,"p_estimated_cost_minor"?: number,"p_fulfilment_method": Database["public"]['Enums']["fulfilment_method"],"p_show_when_fulfilled"?: boolean,"p_submit"?: boolean,"p_target_amount_minor"?: number,"p_title": string,"p_wish_type": Database["public"]['Enums']["wish_type"],"p_wisher_identity"?: Database["public"]['Enums']["wisher_identity"] }; Returns: string
                           },
"get_my_giving":
{ Args: Record<PropertyKey, never>; Returns: {
              "amount_minor": number,"created_at": string,"currency": string,"id": string,"is_anonymous": boolean,"kind": string,"mode": Database["public"]['Enums']["payment_mode"],"status": string,"wish_id": string,"wish_status": Database["public"]['Enums']["wish_status"],"wish_title": string,"wisher_display": string
            }[]
                           },
"get_offer_thread":
{ Args: { "p_offer_id": string }; Returns: Json
                           },
"get_wish_contributions":
{ Args: { "p_wish_id": string }; Returns: {
              "amount_minor": number,"created_at": string,"currency": string,"id": string,"message": string,"mode": Database["public"]['Enums']["payment_mode"],"status": Database["public"]['Enums']["contribution_status"],"supporter_display": string
            }[]
                           },
"get_wish_offers":
{ Args: { "p_wish_id": string }; Returns: {
              "created_at": string,"decided_at": string,"decision_note": string,"delivery_plan": string,"dispute_reason": string,"disputed_by": string,"giver_confirmed_at": string,"giver_display": string,"id": string,"is_anonymous": boolean,"message": string,"resolution_note": string,"status": Database["public"]['Enums']["offer_status"],"wisher_confirmed_at": string
            }[]
                           },
"make_offer":
{ Args: { "p_delivery_plan"?: string,"p_idempotency_key": string,"p_is_anonymous"?: boolean,"p_message"?: string,"p_wish_id": string }; Returns: string
                           },
"offer_action":
{ Args: { "p_action": string,"p_note"?: string,"p_offer_id": string }; Returns: Database["public"]['Enums']["offer_status"]
                           },
"public_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"publish_wish":
{ Args: { "p_wish_id": string }; Returns: undefined
                           },
"record_contribution_result":
{ Args: { "p_contribution_id": string,"p_provider_reference": string,"p_succeeded": boolean }; Returns: Database["public"]['Enums']["contribution_status"]
                           },
"remove_wish_image":
{ Args: { "p_image_id": string }; Returns: string
                           },
"report_wish":
{ Args: { "p_details"?: string,"p_reason": Database["public"]['Enums']["report_reason"],"p_wish_id": string }; Returns: string
                           },
"respond_to_offer":
{ Args: { "p_accept": boolean,"p_note"?: string,"p_offer_id": string }; Returns: undefined
                           },
"send_offer_message":
{ Args: { "p_body": string,"p_offer_id": string }; Returns: string
                           },
"submit_support_request":
{ Args: { "p_contact_email": string,"p_message": string,"p_subject": string }; Returns: string
                           },
"submit_wish":
{ Args: { "p_wish_id": string }; Returns: undefined
                           },
"update_wish":
{ Args: { "p_additional_info"?: string,"p_category_slug": string,"p_country_code": string,"p_currency"?: string,"p_description": string,"p_estimated_cost_minor"?: number,"p_fulfilment_method": Database["public"]['Enums']["fulfilment_method"],"p_show_when_fulfilled"?: boolean,"p_submit"?: boolean,"p_target_amount_minor"?: number,"p_title": string,"p_wish_id": string,"p_wish_type": Database["public"]['Enums']["wish_type"],"p_wisher_identity"?: Database["public"]['Enums']["wisher_identity"] }; Returns: undefined
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
                           },
"withdraw_wish":
{ Args: { "p_reason"?: string,"p_wish_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "account_status": "active"|"restricted"|"suspended","app_role": "user"|"admin","contribution_status": "pending"|"succeeded"|"failed"|"refunded"|"cancelled","fulfilment_method": "gift_purchase"|"monetary_contribution"|"gift_card"|"service_or_experience"|"other","notification_type": "wish_submitted"|"wish_approved"|"wish_published"|"wish_rejected"|"wish_changes_requested"|"wish_suspended"|"wish_reinstated"|"wish_fulfilled"|"wish_withdrawn"|"offer_received"|"offer_accepted"|"offer_declined"|"offer_cancelled"|"offer_in_progress"|"offer_delivered"|"offer_completed"|"offer_disputed"|"dispute_resolved"|"offer_message"|"contribution_received"|"target_reached"|"contribution_refunded"|"report_update"|"account_action","offer_status": "offered"|"accepted"|"declined"|"in_progress"|"awaiting_confirmation"|"completed"|"cancelled"|"disputed","payment_mode": "test"|"live","refund_status": "requested"|"processing"|"succeeded"|"failed"|"rejected","report_reason": "fraud_or_scam"|"prohibited_item"|"harassment"|"child_safety"|"credential_phishing"|"personal_information"|"spam"|"other","report_status": "open"|"investigating"|"resolved"|"dismissed","support_status": "open"|"in_progress"|"closed","wish_status": "draft"|"pending_review"|"changes_requested"|"approved"|"active"|"fulfilment_pending"|"fulfilled"|"withdrawn"|"rejected"|"suspended","wish_type": "physical_gift"|"financial_goal"|"experience"|"service"|"other","wisher_identity": "username"|"anonymous"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "restricted", "suspended"],"app_role": ["user", "admin"],"contribution_status": ["pending", "succeeded", "failed", "refunded", "cancelled"],"fulfilment_method": ["gift_purchase", "monetary_contribution", "gift_card", "service_or_experience", "other"],"notification_type": ["wish_submitted", "wish_approved", "wish_published", "wish_rejected", "wish_changes_requested", "wish_suspended", "wish_reinstated", "wish_fulfilled", "wish_withdrawn", "offer_received", "offer_accepted", "offer_declined", "offer_cancelled", "offer_in_progress", "offer_delivered", "offer_completed", "offer_disputed", "dispute_resolved", "offer_message", "contribution_received", "target_reached", "contribution_refunded", "report_update", "account_action"],"offer_status": ["offered", "accepted", "declined", "in_progress", "awaiting_confirmation", "completed", "cancelled", "disputed"],"payment_mode": ["test", "live"],"refund_status": ["requested", "processing", "succeeded", "failed", "rejected"],"report_reason": ["fraud_or_scam", "prohibited_item", "harassment", "child_safety", "credential_phishing", "personal_information", "spam", "other"],"report_status": ["open", "investigating", "resolved", "dismissed"],"support_status": ["open", "in_progress", "closed"],"wish_status": ["draft", "pending_review", "changes_requested", "approved", "active", "fulfilment_pending", "fulfilled", "withdrawn", "rejected", "suspended"],"wish_type": ["physical_gift", "financial_goal", "experience", "service", "other"],"wisher_identity": ["username", "anonymous"]
          }
        }
} as const
