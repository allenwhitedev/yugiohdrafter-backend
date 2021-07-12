export interface CardSet{
    id: string,
    set_name: string,
    set_code: string,
    num_of_cards: number,
    tcg_date: string
    card_ids?: string[]
    custom_set?: boolean
}