Feature: Ecommerce validation

    @Validation
    @foo
    Scenario Outline: Scenario Outline name: Placing the Order
        Given a user login to Ecommerce2 application with "<username>" and "<password>"
        Then Verify Error message is displayed

        Examples:
            | username               | password      |
            | lkk3229@gmail.com      | Lkk@3229      |
            | anshika@gmail.com      | Iamking@000   |


#Parameterization, parallel, html, rerun failed tests
