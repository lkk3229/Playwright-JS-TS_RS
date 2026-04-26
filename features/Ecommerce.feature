Feature: Ecommerce validation

    @Regression
    Scenario: Placing the Order
        Given a user login to Ecommerce application with "lkk3229@gmail.com" and "Lkk@3229"
        When Add "ZARA COAT 3" to Cart
        Then verify "ZARA COAT 4" is displayed in the cart
        When Enter valid details and Place the Order
        Then Verify order is present in the OrderHistory

    @Validation
    Scenario Outline: Scenario Outline name: Placing the Order
        Given a user login to Ecommerce2 application with "<username>" and "<password>"
        Then Verify Error message is displayed

        Examples:
            | username               | password      |
            | lkk3229@gmail.com      | Lkk@3229      |
            | anshika@gmail.com      | Iamking@000   |